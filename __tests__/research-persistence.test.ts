import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { isSafeResearchUrl } from "../convex/research";

const modules = import.meta.glob("../convex/**/*.ts");

function identity(subject: string) {
  return {
    subject,
    issuer: "https://nexus-forge.test",
    tokenIdentifier: `https://nexus-forge.test|${subject}`,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Research Oracle persistence", () => {
  it("allows ordinary HTTPS DNS URLs and rejects unsafe URL forms", () => {
    expect(isSafeResearchUrl("https://example.com/research")).toBe(true);
    expect(isSafeResearchUrl("https://www.example.co.uk/path")).toBe(true);
    for (const url of [
      "http://example.com/",
      "https://user:pass@example.com/",
      "https://example.com:8443/",
      "https://localhost/",
      "https://service.localhost/",
      "https://metadata.google.internal/",
      "https://service.internal/",
      "https://service.local/",
      "https://127.0.0.1/",
      "https://127.1/",
      "https://2130706433/",
      "https://0x7f000001/",
      "https://[::1]/",
      "https://singlelabel/",
    ]) {
      expect(isSafeResearchUrl(url), url).toBe(false);
    }
  });
  it("saves authenticated research and filters citations to retrieved sources", async () => {
    const t = convexTest(schema, modules);
    const owner = "research-owner-a";
    const missionId = await t.run(async (ctx) => ctx.db.insert("missions", {
      title: "Research persistence test",
      mission: "Validate source-backed research persistence",
      autonomy: "guided",
      budget: 0,
      status: "draft",
      completion: 0,
      approved: false,
      ownerKey: owner,
    }));
    const target = "https://example.com/research";
    const wrapped = "https://html.duckduckgo.com/html/?uddg=" + encodeURIComponent(target);
    const html = `<a class="result__a" href="${wrapped}">Example research</a><div class="result__snippet">A useful source snippet.</div>`;
    const providerResult = JSON.stringify({
      result: "The retrieved source supports a narrow, testable opportunity.",
      citations: [target, "https://unretrieved.example/fabricated"],
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(html, { status: 200, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response("<html><body>Verified source page content</body></html>", { status: 200, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: providerResult } }] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubEnv("GROQ_API_KEY", "test-provider-key");
    vi.stubGlobal("fetch", fetchMock);

    const operator = t.withIdentity(identity(owner));
    const result = await operator.action(api.research.search, {
      missionId,
      query: "test a source-backed opportunity",
      deepResearch: false,
    });
    const rows = await operator.query(api.research.list, { missionId });

    expect(result.ok).toBe(true);
    expect(result.result).toContain("narrow, testable opportunity");
    expect(result.citations).toEqual([target]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(target);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      missionId,
      query: "test a source-backed opportunity",
      result: result.result,
      citations: [target],
    });
    await expect(t.withIdentity(identity("research-owner-b")).query(api.research.list, { missionId }))
      .rejects.toThrow(/access denied|not found/i);
  });

  it("does not follow a source redirect to a private or local destination", async () => {
    const t = convexTest(schema, modules);
    const owner = "research-redirect-owner";
    const missionId = await t.run(async (ctx) => ctx.db.insert("missions", {
      title: "Redirect safety test",
      mission: "Verify unsafe source redirects are not followed",
      autonomy: "guided",
      budget: 0,
      status: "draft",
      completion: 0,
      approved: false,
      ownerKey: owner,
    }));
    const target = "https://example.com/research";
    const wrapped = "https://html.duckduckgo.com/html/?uddg=" + encodeURIComponent(target);
    const html = `<a class="result__a" href="${wrapped}">Example research</a>`;
    const providerResult = JSON.stringify({ result: "A cautious result based on the available source metadata.", citations: [target] });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(html, { status: 200, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: providerResult } }] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubEnv("GROQ_API_KEY", "test-provider-key");
    vi.stubGlobal("fetch", fetchMock);

    const operator = t.withIdentity(identity(owner));
    const result = await operator.action(api.research.search, {
      missionId,
      query: "test unsafe redirect handling",
      deepResearch: false,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(target);
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes("127.0.0.1"))).toBe(false);
    expect(result.citations).toEqual([target]);
  });

  it("stops after the redirect-hop limit and never fetches the next destination", async () => {
    const t = convexTest(schema, modules);
    const owner = "research-redirect-cap-owner";
    const missionId = await t.run(async (ctx) => ctx.db.insert("missions", {
      title: "Redirect cap test",
      mission: "Verify redirect chains have a strict hop limit",
      autonomy: "guided",
      budget: 0,
      status: "draft",
      completion: 0,
      approved: false,
      ownerKey: owner,
    }));
    const target = "https://example.com/research";
    const wrapped = "https://html.duckduckgo.com/html/?uddg=" + encodeURIComponent(target);
    const html = `<a class="result__a" href="${wrapped}">Example research</a>`;
    const providerResult = JSON.stringify({ result: "Result based only on available source metadata.", citations: [] });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(html, { status: 200, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/research?hop=1" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/research?hop=2" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/research?hop=3" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/research?hop=4" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/research?hop=5" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: providerResult } }] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubEnv("GROQ_API_KEY", "test-provider-key");
    vi.stubGlobal("fetch", fetchMock);

    const result = await t.withIdentity(identity(owner)).action(api.research.search, {
      missionId,
      query: "test redirect chain limit",
      deepResearch: false,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes("hop=5"))).toBe(false);
  });

  it("rejects anonymous research before making external requests", async () => {
    const t = convexTest(schema, modules);
    const missionId = await t.run(async (ctx) => ctx.db.insert("missions", {
      title: "Anonymous research test",
      mission: "Validate anonymous access is rejected",
      autonomy: "guided",
      budget: 0,
      status: "draft",
      completion: 0,
      approved: false,
      ownerKey: "research-owner-a",
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(t.action(api.research.search, {
      missionId,
      query: "test research",
      deepResearch: false,
    })).rejects.toThrow(/authenticated operator session required/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
