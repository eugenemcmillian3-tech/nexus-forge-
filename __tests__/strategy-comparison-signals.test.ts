import { describe, expect, it } from "vitest";
import { deriveStrategyComparisonSignals } from "../src/lib/strategy-comparison-signals";

const row = (id: string, record: unknown) => ({
  _id: id,
  _creationTime: 1,
  key: `learning-experiment:${id}`,
  value: JSON.stringify(record),
});
const experiment = (overrides: Record<string, unknown> = {}) => ({
  name: "Baseline comparison",
  linkedManifestStrategy: { id: "strategy-1", name: "Small pilot" },
  baselineSafetyPass: true,
  candidateSafetyPass: true,
  metrics: [
    { key: "quality", label: "Quality", baseline: 70, candidate: 75, unit: "score", direction: "higher", evidence: "report run 1" },
    { key: "cost", label: "Cost", baseline: 5, candidate: 4, unit: "USD", direction: "lower", evidence: "billing report" },
  ],
  ...overrides,
});

describe("repeatable strategy comparison signals", () => {
  it("recognizes repeated improvements only across evidence-backed, safety-passing comparable runs", () => {
    const result = deriveStrategyComparisonSignals([
      row("one", experiment()),
      row("two", experiment({ metrics: [
        { key: "quality", label: "Quality", baseline: 70, candidate: 74, unit: "score", direction: "higher", evidence: "report run 2" },
        { key: "cost", label: "Cost", baseline: 5, candidate: 4.5, unit: "USD", direction: "lower", evidence: "billing report 2" },
      ] })),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      strategyId: "strategy-1",
      strategyName: "Small pilot",
      experimentCount: 2,
      comparableMetricCount: 2,
      improvedRuns: 2,
      regressedRuns: 0,
      inconclusiveRuns: 0,
    });
    expect(result[0].recommendation).toContain("not causal proof");
    expect(result[0].recommendation).toContain("human-controlled reuse");
  });

  it("excludes runs with missing evidence or failed safety and never calls them wins", () => {
    const result = deriveStrategyComparisonSignals([
      row("missing-evidence", experiment({ metrics: [
        { key: "quality", label: "Quality", baseline: 70, candidate: 90, unit: "score", direction: "higher", evidence: " " },
      ] })),
      row("unsafe", experiment({ candidateSafetyPass: false })),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].experimentCount).toBe(2);
    expect(result[0].improvedRuns).toBe(0);
    expect(result[0].inconclusiveRuns).toBe(2);
    expect(result[0].recommendation).toContain("Insufficient");
  });

  it("does not compare incompatible units or metric sets as if they were equivalent", () => {
    const result = deriveStrategyComparisonSignals([
      row("one", experiment()),
      row("two", experiment({ metrics: [
        { key: "quality", label: "Quality", baseline: 70, candidate: 90, unit: "percent", direction: "higher", evidence: "report run 2" },
      ] })),
    ]);
    expect(result[0].improvedRuns).toBe(1);
    expect(result[0].inconclusiveRuns).toBe(1);
    expect(result[0].recommendation).not.toContain("Repeated measured improvements");
  });

  it("ignores standalone and malformed experiment records", () => {
    const result = deriveStrategyComparisonSignals([
      row("standalone", experiment({ linkedManifestStrategy: null })),
      { _id: "bad", _creationTime: 1, key: "bad", value: "not json" },
    ]);
    expect(result).toEqual([]);
  });
});
