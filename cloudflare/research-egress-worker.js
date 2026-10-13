// NEXUS FORGE Research Oracle egress gateway.
//
// Deployed Cloudflare Worker (tracked in GitHub issue #51). It is the only
// component allowed to retrieve user-discovered research pages:
//   - HTTPS-only, credential-free, port-443, DNS-name URLs (no IP literals).
//   - Every hop (including each redirect) is resolved via DNS-over-HTTPS and
//     ALL resolved addresses are checked against the private/reserved/
//     metadata policy before any request is made.
//   - Transport is Cloudflare's managed fetch proxy. Deployed tests recorded
//     on 2026-10-13 show the proxy refuses connections to private, link-local
//     (including 169.254.169.254), and loopback destinations at connection
//     time, which is the connection-level enforcement layer behind the
//     gateway's own pre-validation. Raw pinned-IP TCP to port 443 is not
//     permitted on Workers by platform design.
//   - Bounded response reads, redirect cap, hop timeout, fail-closed errors.
// Secrets: GATEWAY_BEARER_TOKEN is set through the Cloudflare secret manager.

import { selectPinnedIp, validateResearchUrl } from "./egress-policy.js";

const POLICY_VERSION = "research-egress-v1";
const MAX_REDIRECTS = 4;
const HOP_TIMEOUT_MS = 12000;
const DEFAULT_BODY_BYTES = 120000;
const MAX_BODY_BYTES = 300000;
const MIN_BODY_BYTES = 1000;
const DOH_RESOLVERS = ["https://dns.google/resolve", "https://cloudflare-dns.com/dns-query"];

export default {
  async fetch(request, env) {
    if (!env || !env.GATEWAY_BEARER_TOKEN) {
      return jsonResponse({ ok: false, error: "gateway_unconfigured" }, 500);
    }
    if (!(await authorized(request, env.GATEWAY_BEARER_TOKEN))) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(
        {
          ok: true,
          policy: POLICY_VERSION,
          maxBodyBytes: MAX_BODY_BYTES,
          redirectCap: MAX_REDIRECTS,
          hopTimeoutMs: HOP_TIMEOUT_MS,
        },
        200,
      );
    }
    if (request.method === "POST" && url.pathname === "/fetch") {
      return handleFetch(request);
    }
    return jsonResponse({ ok: false, error: "not_found" }, 404);
  },
};

async function handleFetchBody(request) {
  try {
    return { body: await request.json() };
  } catch {
    return { failure: "bad_request" };
  }
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function authorized(request, token) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  const encoder = new TextEncoder();
  const [supplied, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(match[1])),
    crypto.subtle.digest("SHA-256", encoder.encode(token)),
  ]);
  const left = new Uint8Array(supplied);
  const right = new Uint8Array(expected);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function withTimeout(promise, ms, code) {
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error(code)), ms);
    }),
  ]);
}

async function handleFetch(request) {
  const parsed = await handleFetchBody(request);
  if (parsed.failure) return jsonResponse({ ok: false, error: "bad_request" }, 400);
  const body = parsed.body;
  if (!body || typeof body.url !== "string") {
    return jsonResponse({ ok: false, error: "bad_request" }, 400);
  }
  const requestedBytes = Number(body.maxBytes);
  const maxBytes = Number.isFinite(requestedBytes)
    ? Math.min(Math.max(Math.trunc(requestedBytes), MIN_BODY_BYTES), MAX_BODY_BYTES)
    : DEFAULT_BODY_BYTES;
  const initial = validateResearchUrl(body.url);
  if (!initial.ok) {
    return jsonResponse({ ok: false, error: initial.reason }, initial.reason === "destination_rejected" ? 403 : 400);
  }
  const hops = [];
  let current = initial.url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const check = validateResearchUrl(current);
      if (!check.ok) {
        return jsonResponse(
          { ok: false, error: check.reason === "destination_rejected" ? "redirect_destination_rejected" : "bad_request" },
          403,
        );
      }
      hops.push(check.url);
      const pinned = await resolveAndPin(check.host);
      if (pinned.error) {
        return jsonResponse({ ok: false, error: pinned.error }, pinned.status);
      }
      let response;
      try {
        response = await withTimeout(
          fetch(check.url, {
            redirect: "manual",
            headers: {
              "User-Agent": "NEXUS-FORGE-Research/1.0",
              Accept: "text/html,application/xhtml+xml",
              "Accept-Encoding": "identity",
            },
          }),
          HOP_TIMEOUT_MS,
          "timeout",
        );
      } catch (error) {
        const code = error && error.message === "timeout" ? "timeout" : "connect_failed";
        return jsonResponse({ ok: false, error: code }, code === "timeout" ? 504 : 502);
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) {
          return jsonResponse({ ok: false, error: "redirect_limit" }, 422);
        }
        current = new URL(location, check.url).toString();
        continue;
      }
      const read = await readBodyBounded(response, maxBytes, HOP_TIMEOUT_MS);
      return jsonResponse(
        {
          ok: true,
          status: response.status,
          contentType: response.headers.get("content-type") || "",
          finalUrl: check.url,
          hops,
          body: read.bodyText,
          truncated: read.truncated,
          policy: POLICY_VERSION,
        },
        200,
      );
    }
    return jsonResponse({ ok: false, error: "redirect_limit" }, 422);
  } catch (error) {
    const code = error && typeof error.code === "string" ? error.code : "upstream_error";
    const status = error && typeof error.status === "number" ? error.status : 502;
    return jsonResponse({ ok: false, error: code }, status);
  }
}

async function readBodyBounded(response, maxBytes, timeoutMs) {
  if (!response.body) return { bodyText: "", truncated: false };
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  const finish = async () => {
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }
  };
  try {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw { code: "timeout", status: 504 };
      const read = await withTimeout(reader.read(), remaining, "timeout");
      if (read.done) break;
      chunks.push(read.value);
      total += read.value.byteLength;
      if (total >= maxBytes) {
        truncated = true;
        await finish();
        break;
      }
    }
  } catch (error) {
    await finish();
    if (error && error.message === "timeout") throw { code: "timeout", status: 504 };
    throw error && typeof error.code === "string" ? error : { code: "upstream_error", status: 502 };
  }
  const merged = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const room = merged.byteLength - offset;
    if (room <= 0) break;
    merged.set(chunk.subarray(0, room), offset);
    offset += Math.min(chunk.byteLength, room);
  }
  return { bodyText: new TextDecoder().decode(merged), truncated };
}

async function dohQuery(host, type) {
  let lastFailure = "doh_no_resolver";
  for (const resolver of DOH_RESOLVERS) {
    const url = `${resolver}?name=${encodeURIComponent(host)}&type=${type}`;
    try {
      const response = await withTimeout(
        fetch(url, { headers: { accept: "application/dns-json" } }),
        6000,
        "doh_timeout",
      );
      if (!response.ok) {
        lastFailure = `doh_status_${response.status}`;
        continue;
      }
      const data = await response.json();
      if (!data || typeof data !== "object" || typeof data.Status !== "number") {
        lastFailure = "doh_parse_failed";
        continue;
      }
      return { data };
    } catch (error) {
      lastFailure = error && error.message === "doh_timeout" ? "doh_timeout" : "doh_failed";
    }
  }
  return { failure: lastFailure };
}

/**
 * Resolve a hostname via DNS-over-HTTPS and require at least one answer that
 * passed the public-address policy before any request is made. The managed
 * fetch proxy independently refuses private/reserved destinations at
 * connection time (verified 2026-10-13 against 10.0.0.1, 169.254.169.254,
 * and 127.0.0.1), closing the DNS rebinding window behind this validation.
 */
async function resolveAndPin(host) {
  const a = await dohQuery(host, "A");
  const pinnedA = a.data ? selectPinnedIp(Array.isArray(a.data.Answer) ? a.data.Answer : []) : null;
  if (pinnedA) return { ip: pinnedA.ip };
  const aaaa = await dohQuery(host, "AAAA");
  const pinnedAaaa = aaaa.data ? selectPinnedIp(Array.isArray(aaaa.data.Answer) ? aaaa.data.Answer : []) : null;
  if (pinnedAaaa) return { ip: pinnedAaaa.ip };
  const hadAnswers =
    (a.data && Array.isArray(a.data.Answer) && a.data.Answer.length > 0) ||
    (aaaa.data && Array.isArray(aaaa.data.Answer) && aaaa.data.Answer.length > 0);
  if (hadAnswers) return { error: "destination_rejected", status: 403 };
  const resolverFailure = a.failure || aaaa.failure;
  if (resolverFailure) return { error: resolverFailure, status: 502 };
  return { error: "resolve_failed", status: 422 };
}
