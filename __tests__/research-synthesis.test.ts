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

describe("Research Oracle synthesis", () => {
  it("synthesizes saved research and persists an owner-scoped learning memory", async () => {
    const t = convexTest(schema, modules);
    const owner = "research-synthesis-owner";
    const missionId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("missions", {
        title: "Synthesis persistence test",
        mission: "Verify evidence-backed research synthesis",
        autonomy: "guided",
        budget: 0,
        status: "draft",
        completion: 0,
        approved: false,
        ownerKey: owner,
      });
      await ctx.db.insert("research", {
        missionId: id,
        query: "market signal",
        result: "A credible source indicates a measurable customer pain point.",
        citations: ["https://example.com/evidence"],
        createdAt: Date.now(),
      });
      return id;
    });
    const synthesis = "SIGNALS: customer pain point. UNCERTAINTY: sample size. OPPORTUNITIES: validate demand. RISKS: weak evidence. NEXT QUESTION: will customers pay?";
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(
      JSON.stringify({ choices: [{ message: { content: synthesis } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));
    vi.stubEnv("GROQ_API_KEY", "test-provider-key");
    vi.stubGlobal("fetch", fetchMock);

    const result = await t.withIdentity(identity(owner)).action(api.research.synthesize, { missionId, ownerKey: owner });
    const memories = await t.run(async (ctx) =>
      ctx.db.query("memories").withIndex("by_owner", (q) => q.eq("ownerKey", owner)).collect(),
    );

    expect(result.ok).toBe(true);
    expect(result.synthesis).toContain("customer pain point");
    expect(result.sourceCount).toBe(1);
    expect(memories).toHaveLength(1);
    expect(memories[0]).toMatchObject({
      missionId,
      category: "research-synthesis",
      value: result.synthesis,
      source: "NEXUS Research Oracle",
    });
  });

  it("rejects synthesis for another operator before calling the provider", async () => {
    const t = convexTest(schema, modules);
    const missionId = await t.run(async (ctx) => ctx.db.insert("missions", {
      title: "Foreign synthesis test",
      mission: "Verify synthesis ownership",
      autonomy: "guided",
      budget: 0,
      status: "draft",
      completion: 0,
      approved: false,
      ownerKey: "research-synthesis-owner-a",
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(t.withIdentity(identity("research-synthesis-owner-b")).action(api.research.synthesize, {
      missionId,
      ownerKey: "research-synthesis-owner-a",
    })).rejects.toThrow(/access denied|not found/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
