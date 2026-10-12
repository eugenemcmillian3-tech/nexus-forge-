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

const candidates = [
  { name: "Small pilot", mechanism: "Test one narrow user segment", prerequisites: "A reachable pilot audience", timeToEvidence: "Within one week", expectedValue: "Activation evidence", reversibility: "Easy to stop", failureMode: "Too few participants", unverifiedAssumptions: "Pilot users resemble the target audience" },
  { name: "Workflow prototype", mechanism: "Build the smallest end-to-end slice", prerequisites: "One measurable use case", timeToEvidence: "Within three days", expectedValue: "Usability and delivery evidence", reversibility: "Can be discarded", failureMode: "Prototype misses the real need", unverifiedAssumptions: "The workflow can be automated safely" },
  { name: "Manual concierge", mechanism: "Deliver the result manually before automating", prerequisites: "Operator time and a test user", timeToEvidence: "Within two days", expectedValue: "Direct problem-fit evidence", reversibility: "Stop after the pilot", failureMode: "Manual service does not scale", unverifiedAssumptions: "Users value the outcome enough to return" },
];

const generated = [
  "## Manifest",
  "A bounded proposal with a measurable first experiment.",
  "",
  "```manifest-strategies",
  JSON.stringify(candidates),
  "```",
].join("\n");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Manifest provider-to-ledger persistence", () => {
  it("persists the provider blueprint and structured strategies to the authenticated owner's private ledger", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("GROQ_API_KEY", "test-provider-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: generated } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));

    const operator = t.withIdentity(identity("manifest-owner-a"));
    const result = await operator.action(api.manifestIntelligence.synthesize, {
      intent: "Create a measurable product experiment for a new digital workflow.",
      domain: "AI product / venture",
      budget: 25,
      horizon: "14 days",
      constraints: "Keep external actions governed and use existing resources.",
      acceptanceCriteria: "Save a readable blueprint and three structured candidates.",
    });

    expect(result).toMatchObject({ saved: true, strategyCount: 3, strategyBlockValid: true });
    expect(result.blueprint).toContain("A bounded proposal");

    const blueprints = await operator.query(api.manifestIntelligence.listBlueprints, {});
    const strategies = await operator.query(api.manifestIntelligence.listStrategies, {});
    const otherOwnerStrategies = await t.withIdentity(identity("manifest-owner-b"))
      .query(api.manifestIntelligence.listStrategies, {});

    expect(blueprints).toHaveLength(1);
    expect(JSON.parse(blueprints[0].value)).toMatchObject({
      intent: "Create a measurable product experiment for a new digital workflow.",
      domain: "AI product / venture",
    });
    expect(strategies).toHaveLength(3);
    expect(strategies.map(row => JSON.parse(row.value).name).sort()).toEqual([
      "Manual concierge", "Small pilot", "Workflow prototype",
    ]);
    expect(otherOwnerStrategies).toEqual([]);
  });

  it("rejects anonymous synthesis before invoking the provider", async () => {
    const t = convexTest(schema, modules);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(t.action(api.manifestIntelligence.synthesize, {
      intent: "Create a measurable product experiment for a new digital workflow.",
      domain: "AI product / venture",
      budget: 25,
      horizon: "14 days",
    })).rejects.toThrow(/authenticated operator session required/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
