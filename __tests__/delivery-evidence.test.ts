import { describe, expect, it } from "vitest";
import { evaluateDeliveryEvidence } from "../convex/deliveryEvidence";

const validEvidence = {
  artifactId: "artifact-1",
  target: "nexus-forge1/no-dispatch",
  workflowRunUrl: "https://github.com/nexus-forge1/no-dispatch/actions/runs/38105069247",
  workflowConclusion: "success",
  workflowCommitSha: "a".repeat(40),
  deploymentRunUrl: "https://github.com/nexus-forge1/no-dispatch/actions/runs/38105069247",
  deploymentCommitSha: "a".repeat(40),
  deploymentUrl: "https://nexus-forge1.github.io/no-dispatch/",
  readinessStatus: "pass",
  readinessPassedCount: 6,
  readinessTotalCount: 6,
};

describe("evaluateDeliveryEvidence", () => {
  it("accepts complete structured evidence for the approved repository and matching commit", () => {
    const result = evaluateDeliveryEvidence(validEvidence);
    expect(result.passed).toBe(true);
    expect(result.passedCount).toBe(4);
    expect(result.score).toBe(1);
  });

  it("rejects workflow URLs for an unrelated repository", () => {
    const result = evaluateDeliveryEvidence({
      ...validEvidence,
      workflowRunUrl: "https://github.com/attacker/other/actions/runs/12345",
    });
    expect(result.passed).toBe(false);
    expect(result.checks[1]).toContain("invalid");
  });

  it("rejects deployment evidence with a different commit", () => {
    const result = evaluateDeliveryEvidence({
      ...validEvidence,
      deploymentCommitSha: "b".repeat(40),
    });
    expect(result.passed).toBe(false);
    expect(result.checks[2]).toContain("mismatched");
  });

  it("rejects deployment evidence from a different workflow run", () => {
    const result = evaluateDeliveryEvidence({
      ...validEvidence,
      deploymentRunUrl: "https://github.com/nexus-forge1/no-dispatch/actions/runs/99999",
    });
    expect(result.passed).toBe(false);
    expect(result.checks[2]).toContain("mismatched");
  });

  it("rejects incomplete or failing readiness evidence", () => {
    const result = evaluateDeliveryEvidence({
      ...validEvidence,
      readinessStatus: "fail",
      readinessPassedCount: 5,
      readinessTotalCount: 6,
    });
    expect(result.passed).toBe(false);
    expect(result.checks[3]).toContain("incomplete");
  });

  it("rejects malformed commit hashes and non-HTTPS deployment URLs", () => {
    const result = evaluateDeliveryEvidence({
      ...validEvidence,
      workflowCommitSha: "not-a-sha",
      deploymentUrl: "http://example.com",
    });
    expect(result.passed).toBe(false);
  });

  it("does not treat free-text evidence as proof", () => {
    const spoofed = {
      target: validEvidence.target,
      evidence: "GitHub Actions success; deployment verified; smoke test passed",
    } as unknown as Parameters<typeof evaluateDeliveryEvidence>[0];
    const result = evaluateDeliveryEvidence(spoofed);
    expect(result.passed).toBe(false);
    expect(result.passedCount).toBe(0);
  });
});
