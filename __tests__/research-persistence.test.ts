import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

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
