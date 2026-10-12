import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
function identity(subject: string) {
  return { subject, issuer: "https://nexus-forge.test", tokenIdentifier: `https://nexus-forge.test|${subject}` };
}
const metrics = [
  { key: "quality", label: "Quality", baseline: 70, candidate: 80, unit: "score", direction: "higher" as const, evidence: "Run report #A-104" },
  { key: "runtime", label: "Runtime", baseline: 30, candidate: 25, unit: "minutes", direction: "lower" as const, evidence: "Run report #A-104" },
  { key: "cost", label: "Cost", baseline: 4, candidate: 4, unit: "USD", direction: "lower" as const, evidence: "Cost ledger entry #17" },
];
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Verified Learning Engine", () => {
  it("persists owner-scoped experiment receipts and never auto-promotes a candidate", async () => {
    const t = convexTest(schema, modules);
    const operator = t.withIdentity(identity("learning-owner-a"));
    const receipt = await operator.mutation(api.learningEngine.recordExperiment, {
      name: "Measured candidate comparison",
      hypothesis: "Candidate improves quality and runtime",
      baselineLabel: "Baseline",
      candidateLabel: "Candidate",
      metrics,
      baselineSafetyPass: true,
      candidateSafetyPass: true,
      notes: "Synthetic test fixture; not real-world evidence.",
    });
    expect(receipt).toMatchObject({ saved: true, decision: "human-review-recommended", improved: 2, regressed: 0, unchanged: 1 });
    const own = await operator.query(api.learningEngine.listExperiments, {});
    const other = await t.withIdentity(identity("learning-owner-b")).query(api.learningEngine.listExperiments, {});
    expect(own).toHaveLength(1);
    expect(JSON.parse(own[0].value)).toMatchObject({ promotionApplied: false, evidenceStatus: "operator-provided; not independently verified" });
    expect(other).toEqual([]);
  });

  it("blocks a candidate when either safety gate fails", async () => {
    const t = convexTest(schema, modules);
    const operator = t.withIdentity(identity("learning-owner-safety"));
    const receipt = await operator.mutation(api.learningEngine.recordExperiment, {
      name: "Safety gate test",
      hypothesis: "Candidate changes performance",
      baselineLabel: "Baseline",
      candidateLabel: "Candidate",
      metrics,
      baselineSafetyPass: true,
      candidateSafetyPass: false,
      notes: "",
    });
    expect(receipt.decision).toBe("do-not-promote");
    expect(receipt.rationale).toMatch(/safety checks did not pass/i);
  });

  it("rejects metric records without an evidence reference", async () => {
    const t = convexTest(schema, modules);
    const operator = t.withIdentity(identity("learning-owner-evidence"));
    await expect(operator.mutation(api.learningEngine.recordExperiment, {
      name: "Evidence required",
      hypothesis: "Candidate changes performance",
      baselineLabel: "Baseline",
      candidateLabel: "Candidate",
      metrics: metrics.map((metric, i) => i === 0 ? { ...metric, evidence: " " } : metric),
      baselineSafetyPass: true,
      candidateSafetyPass: true,
      notes: "",
    })).rejects.toThrow(/evidence reference/i);
  });
});
