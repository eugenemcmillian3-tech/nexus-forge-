import { describe, expect, it } from "vitest";
import { parseMissionSpecification } from "../convex/intentContract";

const validContract = {
  objective: "Build a usable and measurable customer onboarding demo",
  constraints: ["Use the existing app stack"],
  dependencies: ["Configured AI provider"],
  acceptanceCriteria: ["A new user can complete onboarding", "Validation rejects missing required fields"],
  risks: ["Provider availability may vary"],
  deadline: "Within 7 days",
  strategies: [
    { name: "Minimal prototype", rationale: "Ship a narrow testable slice", tradeoff: "Limited scope", expectedOutcome: "Fast evidence from a small pilot" },
    { name: "Full workflow", rationale: "Cover the complete onboarding path", tradeoff: "More implementation and test work", expectedOutcome: "Broader coverage with a longer lead time" },
  ],
  recommendedStrategy: 0,
};

describe("mission intent contract parser", () => {
  it("parses fenced JSON and preserves competing strategies", () => {
    const result = parseMissionSpecification("\`\`\`json\n" + JSON.stringify(validContract) + "\n\`\`\`");
    expect(result.objective).toContain("customer onboarding");
    expect(result.acceptanceCriteria).toHaveLength(2);
    expect(result.strategies).toHaveLength(2);
    expect(result.strategies[result.recommendedStrategy].name).toBe("Minimal prototype");
  });

  it("rejects missing acceptance criteria", () => {
    expect(() => parseMissionSpecification(JSON.stringify({ ...validContract, acceptanceCriteria: ["  "] }))).toThrow(/at least one acceptance criterion/);
  });

  it("rejects duplicate strategy names", () => {
    const duplicate = { ...validContract, strategies: [validContract.strategies[0], { ...validContract.strategies[1], name: "Minimal prototype" }] };
    expect(() => parseMissionSpecification(JSON.stringify(duplicate))).toThrow(/meaningfully distinguishable/);
  });

  it("rejects an out-of-range recommendation", () => {
    expect(() => parseMissionSpecification(JSON.stringify({ ...validContract, recommendedStrategy: 8 }))).toThrow(/invalid recommended strategy index/);
  });

  it("rejects non-contract provider output", () => {
    expect(() => parseMissionSpecification("I cannot provide JSON today.")).toThrow(/valid mission-spec JSON object/);
  });
});
