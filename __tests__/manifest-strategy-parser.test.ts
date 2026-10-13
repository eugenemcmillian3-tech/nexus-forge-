import { describe, expect, it } from "vitest";
import { extractManifestStrategies } from "../convex/manifestStrategyParser";

const candidate = { name: "Small pilot", mechanism: "Test one user segment", prerequisites: "A reachable pilot audience", timeToEvidence: "Within one week", expectedValue: "Evidence about activation", reversibility: "Easy to stop", failureMode: "Too few participants", unverifiedAssumptions: "Pilot users resemble target users" };
const fence = String.fromCharCode(96).repeat(3);

describe("Manifest strategy extraction", () => {
  it("extracts valid structured candidates and leaves readable Markdown", () => {
    const raw = ["## Blueprint", "Run a small pilot.", "", fence + "manifest-strategies", JSON.stringify([candidate, { ...candidate, name: "Second path" }]), fence].join("\n");
    const result = extractManifestStrategies(raw);
    expect(result.blueprint).toContain("Run a small pilot");
    expect(result.strategies).toHaveLength(2);
    expect(result.strategies[0].name).toBe("Small pilot");
    expect(result.validJson).toBe(true);
  });
  it("preserves the full readable response when the optional block is missing", () => {
    const raw = "## Blueprint\nA readable provider response without structured data.";
    expect(extractManifestStrategies(raw)).toMatchObject({ blueprint: raw, strategies: [], foundBlock: false, validJson: false });
  });
  it("removes malformed optional JSON without failing blueprint generation", () => {
    const raw = ["Readable plan.", "", fence + "manifest-strategies", "{bad json}", fence].join("\n");
    const result = extractManifestStrategies(raw);
    expect(result.blueprint).toBe("Readable plan.");
    expect(result.strategies).toEqual([]);
    expect(result.foundBlock).toBe(true);
    expect(result.validJson).toBe(false);
  });
  it("rejects incomplete candidate objects instead of persisting them", () => {
    const raw = ["Readable plan.", fence + "manifest-strategies", JSON.stringify([{ ...candidate, failureMode: 42 }]), fence].join("\n");
    const result = extractManifestStrategies(raw);
    expect(result.strategies).toEqual([]);
    expect(result.validJson).toBe(false);
  });
  it("accepts a JSON-only array from the structured retry", () => {
    const result = extractManifestStrategies(JSON.stringify([candidate, { ...candidate, name: "Second path" }]));
    expect(result.strategies).toHaveLength(2);
    expect(result.validJson).toBe(true);
    expect(result.blueprint).toBe("");
  });
  it("accepts a JSON fenced response from providers that add a fence", () => {
    const raw = [fence + "json", JSON.stringify([candidate]), fence].join("\n");
    const result = extractManifestStrategies(raw);
    expect(result.strategies).toHaveLength(1);
    expect(result.strategies[0].name).toBe("Small pilot");
    expect(result.validJson).toBe(true);
  });
});