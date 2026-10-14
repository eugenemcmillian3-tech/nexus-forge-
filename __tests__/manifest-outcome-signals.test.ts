import { describe, expect, it } from "vitest";
import { deriveManifestOutcomeSignals } from "../src/lib/manifest-outcome-signals";

describe("Manifest outcome learning signals", () => {
  it("preserves the exact blueprint receipt and strategy key", () => {
    const rows = [{
      _id: "strategy-row-1",
      key: "manifest:kh7a55xqfcg63ezf8w8rr770bs8g84w3:strategy:2",
      value: JSON.stringify({
        name: "Small pilot",
        outcomeStatus: "partial",
        actualResult: "Pilot reached four of six target users.",
        evidence: "Pilot interview log, run 2026-10-12",
        actualCost: 12,
        recordedAt: 1760000000000,
      }),
    }];

    expect(deriveManifestOutcomeSignals(rows)).toEqual([expect.objectContaining({
      name: "Small pilot",
      blueprintKey: "manifest:kh7a55xqfcg63ezf8w8rr770bs8g84w3",
      strategyKey: "manifest:kh7a55xqfcg63ezf8w8rr770bs8g84w3:strategy:2",
      status: "partial",
      outcomeCount: 1,
      recommendation: expect.stringContaining("comparable follow-up"),
    })]);
  });

  it("does not turn an assumption or an outcome without evidence into a learning signal", () => {
    const rows = [
      { _id: "assumption", key: "manifest:one:strategy:1", value: JSON.stringify({ name: "Assumption only", unverifiedAssumptions: "Users will return." }) },
      { _id: "missing-evidence", key: "manifest:two:strategy:1", value: JSON.stringify({ name: "No evidence", outcomeStatus: "succeeded", actualResult: "It worked." }) },
      { _id: "malformed", key: "manifest:three:strategy:1", value: "not json" },
    ];
    expect(deriveManifestOutcomeSignals(rows)).toEqual([]);
  });

  it("recommends another comparable run after one success and baseline comparison after repeated successes", () => {
    const once = {
      _id: "once",
      key: "manifest:once:strategy:1",
      value: JSON.stringify({
        name: "One success",
        outcomeHistory: [{ outcomeStatus: "succeeded", actualResult: "One pilot passed.", evidence: "Pilot report" }],
      }),
    };
    const repeated = {
      _id: "repeated",
      key: "manifest:repeated:strategy:1",
      value: JSON.stringify({
        name: "Repeated success",
        outcomeHistory: [
          { outcomeStatus: "succeeded", actualResult: "First pilot passed.", evidence: "Pilot report 1" },
          { outcomeStatus: "succeeded", actualResult: "Second pilot passed.", evidence: "Pilot report 2" },
        ],
      }),
    };
    const signals = deriveManifestOutcomeSignals([once, repeated]);
    expect(signals[0].recommendation).toContain("second comparable run");
    expect(signals[1].outcomeCount).toBe(2);
    expect(signals[1].recommendation).toContain("not causal proof");
  });

  it("keeps a failed outcome as a review cue rather than an automatic strategy change", () => {
    const signals = deriveManifestOutcomeSignals([{
      _id: "failed",
      key: "manifest:failed:strategy:3",
      value: JSON.stringify({
        name: "Failed experiment",
        outcomeHistory: [
          { outcomeStatus: "partial", actualResult: "First run partial.", evidence: "Run 1" },
          { outcomeStatus: "failed", actualResult: "Second run failed.", evidence: "Run 2 failure log" },
        ],
      }),
    }]);
    expect(signals[0].recommendation).toContain("review the failure evidence");
    expect(signals[0].status).toBe("failed");
  });
});
