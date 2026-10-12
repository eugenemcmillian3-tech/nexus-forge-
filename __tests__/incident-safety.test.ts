import { describe, expect, it } from "vitest";
import { directStartBlock, missionIsAlreadyComplete, unresolvedEscalationBlock } from "../convex/incidentSafety";

describe("autonomous restart safety", () => {
  it("treats an already completed mission as terminal before runner timeout checks", () => {
    expect(missionIsAlreadyComplete("complete")).toBe(true);
    expect(missionIsAlreadyComplete("running")).toBe(false);
    expect(missionIsAlreadyComplete(undefined)).toBe(false);
  });
  it("blocks the legacy direct-start entry point from bypassing governed execution", () => {
    expect(directStartBlock()).toContain("matching human decision");
    expect(directStartBlock()).toContain("dependencies, resources, and escalations");
  });
  it("blocks a new run while any incident remains escalated", () => {
    expect(unresolvedEscalationBlock([{ status: "escalated", stage: "timeout_escalation" }])).toContain("requires documented human review and resolution first");
  });

  it("allows a restart after the escalation is resolved", () => {
    expect(unresolvedEscalationBlock([{ status: "resolved", stage: "timeout_escalation" }])).toBeNull();
  });

  it("does not block a mission with no escalated incidents", () => {
    expect(unresolvedEscalationBlock([])).toBeNull();
  });
});
