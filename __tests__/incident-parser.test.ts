import { describe, expect, it } from "vitest";
import { parseIncidentDiagnosis } from "../convex/incidentParser";

describe("incident diagnosis parser", () => {
  it("parses multiline sections and decimal confidence", () => {
    expect(parseIncidentDiagnosis("DIAGNOSIS:\nProvider returned a 429.\nInspect the quota window.\nPROPOSED RECOVERY:\nPause provider retries and route unrelated tasks elsewhere.\nCONFIDENCE:\n0.85")).toEqual({
      diagnosis: "Provider returned a 429.\nInspect the quota window.",
      proposedRecovery: "Pause provider retries and route unrelated tasks elsewhere.",
      confidence: 0.85,
    });
  });
  it("accepts confidence at the valid boundaries", () => {
    expect(parseIncidentDiagnosis("DIAGNOSIS: Unknown\nPROPOSED RECOVERY: Human review\nCONFIDENCE: 1.0").confidence).toBe(1);
    expect(parseIncidentDiagnosis("DIAGNOSIS: Unknown\nPROPOSED RECOVERY: Human review\nCONFIDENCE: 0").confidence).toBe(0);
  });
  it("clamps out-of-range confidence and supplies safe fallback text", () => {
    expect(parseIncidentDiagnosis("CONFIDENCE: 1.5")).toEqual({
      diagnosis: "Insufficient evidence.",
      proposedRecovery: "Human investigation required.",
      confidence: 0,
    });
    expect(parseIncidentDiagnosis("DIAGNOSIS: test\nPROPOSED RECOVERY: test\nCONFIDENCE: 0.7").confidence).toBe(0.7);
  });
});
