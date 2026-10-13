// Pure egress-policy helpers shared verbatim by the deployed Cloudflare Worker
// (cloudflare/research-egress-worker.js) and the Node/Vitest regression suite.
// Keep this file dependency-free and Workers-runtime compatible.

const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function isAllowedHostname(host) {
  if (!host || host === "localhost" || host === "metadata" || host === "metadata.google.internal") return false;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test")) return false;
  if (host.includes(":")) return false; // IPv6 literals
  if (/^\d+(?:\.\d+){0,3}$/.test(host)) return false; // dotted-decimal IPv4 literals and short forms
  if (/^0x[\da-f]+$/i.test(host)) return false; // hex IPv4 forms
  return HOSTNAME_PATTERN.test(host);
}

/**
 * Validate a research source URL. Mirrors the application-level policy in
 * convex/research.ts: absolute HTTPS, no credentials, port 443 only, ordinary
 * dotted DNS names, and no local/internal/metadata hostnames.
 */
export function validateResearchUrl(value) {
  if (typeof value !== "string" || !value || value.length > 2048) return { ok: false, reason: "bad_request" };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: "bad_request" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "bad_request" };
  if (parsed.username || parsed.password) return { ok: false, reason: "bad_request" };
  if (parsed.port !== "" && parsed.port !== "443") return { ok: false, reason: "bad_request" };
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!isAllowedHostname(host)) return { ok: false, reason: "destination_rejected" };
  return { ok: true, url: parsed.toString(), host, path: parsed.pathname + parsed.search };
}

function toIpv4Octets(ip) {
  const parts = typeof ip === "string" ? ip.split(".") : null;
  if (!parts || parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return null;
  return octets;
}

/**
 * Reject loopback, private, carrier-grade NAT, link-local (including cloud
 * metadata), documentation, benchmarking, shared-range, multicast, reserved,
 * and broadcast IPv4 addresses.
 */
export function isPublicIpv4(ip) {
  const octets = toIpv4Octets(ip);
  if (!octets) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 CGNAT (also covers 100.100.100.200 metadata)
  if (a === 169 && b === 254) return false; // 169.254.0.0/16 link-local (also covers 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // 192.0.0.0/24 and TEST-NET-1
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast (224/4), reserved (240/4), broadcast
  return true;
}

/**
 * Parse an IPv6 address into eight numeric groups. Supports "::" compression
 * and embedded IPv4 suffixes (e.g. ::ffff:192.0.2.1). Returns null when the
 * input is not a well-formed IPv6 address.
 */
export function parseIpv6(ip) {
  if (typeof ip !== "string" || !ip.includes(":")) return null;
  let value = ip.replace(/^\[|\]$/g, "");
  let v4Octets = null;
  const lastColon = value.lastIndexOf(":");
  const tail = lastColon === -1 ? "" : value.slice(lastColon + 1);
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(tail)) {
    v4Octets = toIpv4Octets(tail);
    if (!v4Octets) return null;
    value = `${value.slice(0, lastColon + 1)}0:0`;
  }
  let rawGroups;
  if (value.includes("::")) {
    if (value.split("::").length > 2) return null;
    const [head = "", tailPart = ""] = value.split("::");
    const headGroups = head === "" ? [] : head.split(":");
    const tailGroups = tailPart === "" ? [] : tailPart.split(":");
    const missing = 8 - headGroups.length - tailGroups.length;
    if (missing < 0) return null;
    rawGroups = [...headGroups, ...new Array(missing).fill("0"), ...tailGroups];
  } else {
    rawGroups = value.split(":");
  }
  if (rawGroups.length !== 8) return null;
  const groups = rawGroups.map((group) => (/^[0-9a-f]{1,4}$/i.test(group) ? parseInt(group, 16) : NaN));
  if (groups.some((group) => Number.isNaN(group) || group < 0 || group > 0xffff)) return null;
  if (v4Octets) {
    groups[6] = (v4Octets[0] << 8) | v4Octets[1];
    groups[7] = (v4Octets[2] << 8) | v4Octets[3];
  }
  return groups;
}

function embeddedIpv4From(groups, index) {
  return [
    (groups[index] >> 8) & 0xff,
    groups[index] & 0xff,
    (groups[index + 1] >> 8) & 0xff,
    groups[index + 1] & 0xff,
  ].join(".");
}

/**
 * Reject unspecified, loopback, IPv4-mapped/embedded private, ULA, link-local,
 * multicast, documentation, and NAT64-to-private IPv6 addresses. IPv4-mapped
 * and NAT64-wrapped addresses are validated by their inner IPv4 address.
 */
export function isPublicIpv6(ip) {
  const groups = Array.isArray(ip) ? ip : parseIpv6(ip);
  if (!groups || groups.length !== 8) return false;
  if (groups.every((group) => group === 0)) return false; // ::
  if (groups[0] === 0x0064 && groups[1] === 0xff9b && groups.slice(2, 6).every((group) => group === 0)) {
    // 64:ff9b::/96 NAT64: policy follows the wrapped IPv4 address
    return isPublicIpv4(embeddedIpv4From(groups, 6));
  }
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    // IPv4-mapped (::ffff:0:0/96): policy follows the embedded IPv4 address
    return isPublicIpv4(embeddedIpv4From(groups, 6));
  }
  if (groups.slice(0, 6).every((group) => group === 0)) {
    // legacy IPv4-compatible (::/96) form: policy follows the embedded address
    return isPublicIpv4(embeddedIpv4From(groups, 6));
  }
  if ((groups[0] & 0xfe00) === 0xfc00) return false; // fc00::/7 ULA
  if ((groups[0] & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((groups[0] & 0xff00) === 0xff00) return false; // ff00::/8 multicast
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return false; // documentation
  return true;
}

/**
 * Pick one validated, public destination IP from DNS-over-HTTPS JSON answers
 * (type 1 = A, type 28 = AAAA). Prefers IPv4, then IPv6. Returns null when no
 * answer is a public address; the caller must treat that as a policy rejection.
 * The returned address is pinned for the actual TCP connection, which closes
 * the DNS time-of-check/time-of-use window (rebinding cannot move the
 * connection to a different, unvalidated address).
 */
export function selectPinnedIp(answers) {
  if (!Array.isArray(answers)) return null;
  const v4 = [];
  const v6 = [];
  for (const answer of answers) {
    if (!answer || typeof answer.data !== "string") continue;
    if (answer.type === 1) v4.push(answer.data);
    else if (answer.type === 28) v6.push(answer.data);
  }
  for (const ip of v4) if (isPublicIpv4(ip)) return { ip, family: 4 };
  for (const ip of v6) if (isPublicIpv6(ip)) return { ip, family: 6 };
  return null;
}
