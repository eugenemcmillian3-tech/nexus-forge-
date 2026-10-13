export type DeliveryEvidenceInput = {
  artifactId?: string | null;
  target: string;
  workflowRunUrl?: string | null;
  workflowConclusion?: string | null;
  workflowCommitSha?: string | null;
  deploymentRunUrl?: string | null;
  deploymentCommitSha?: string | null;
  deploymentUrl?: string | null;
  readinessStatus?: string | null;
  readinessPassedCount?: number | null;
  readinessTotalCount?: number | null;
};

function validRunUrl(value: string | null | undefined, target: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const targetParts = target.split("/");
    return url.protocol === "https:" &&
      url.hostname === "github.com" &&
      targetParts.length === 2 &&
      parts.length >= 5 &&
      parts[0] === targetParts[0] &&
      parts[1] === targetParts[1] &&
      parts[2] === "actions" &&
      parts[3] === "runs" &&
      parts[4].length > 0 &&
      [...parts[4]].every((char) => "0123456789".includes(char));
  } catch {
    return false;
  }
}

function validSha(value: string | null | undefined): value is string {
  return typeof value === "string" &&
    value.length === 40 &&
    [...value].every((char) => "0123456789abcdef".includes(char.toLowerCase()));
}

export function evaluateDeliveryEvidence(delivery: DeliveryEvidenceInput) {
  const workflowValid =
    validRunUrl(delivery.workflowRunUrl, delivery.target) &&
    delivery.workflowConclusion === "success" &&
    validSha(delivery.workflowCommitSha);
  const deploymentValid =
    validRunUrl(delivery.deploymentRunUrl, delivery.target) &&
    delivery.deploymentRunUrl === delivery.workflowRunUrl &&
    validSha(delivery.deploymentCommitSha) &&
    validSha(delivery.workflowCommitSha) &&
    delivery.workflowCommitSha.toLowerCase() === delivery.deploymentCommitSha.toLowerCase() &&
    typeof delivery.deploymentUrl === "string" &&
    (() => {
      try {
        const url = new URL(delivery.deploymentUrl!);
        return url.protocol === "https:" && Boolean(url.hostname);
      } catch {
        return false;
      }
    })();
  const readinessValid =
    delivery.readinessStatus === "pass" &&
    typeof delivery.readinessPassedCount === "number" &&
    typeof delivery.readinessTotalCount === "number" &&
    delivery.readinessTotalCount > 0 &&
    delivery.readinessPassedCount === delivery.readinessTotalCount;
  const evidence = [
    `Artifact ID: ${delivery.artifactId ?? "missing"}`,
    `Workflow run URL: ${delivery.workflowRunUrl ?? "missing"}`,
    `Workflow conclusion: ${delivery.workflowConclusion ?? "missing"}`,
    `Workflow commit SHA: ${delivery.workflowCommitSha ?? "missing"}`,
    `Deployment run URL: ${delivery.deploymentRunUrl ?? "missing"}`,
    `Deployment commit SHA: ${delivery.deploymentCommitSha ?? "missing"}`,
    `Deployment URL: ${delivery.deploymentUrl ?? "missing"}`,
    `Readiness: ${delivery.readinessStatus ?? "missing"} (${delivery.readinessPassedCount ?? 0}/${delivery.readinessTotalCount ?? 0})`,
  ];
  const checks = [
    `Artifact delivery evidence: ${delivery.artifactId ? "present" : "missing"}`,
    `Workflow build/test evidence: ${workflowValid ? "valid structured fields" : "missing or invalid structured fields"}`,
    `Production deployment evidence: ${deploymentValid ? "valid matching commit" : "missing or mismatched structured fields"}`,
    `Canonical readiness evidence: ${readinessValid ? "all checks passed" : "missing or incomplete structured fields"}`,
  ];
  const passedCount = [
    Boolean(delivery.artifactId),
    workflowValid,
    deploymentValid,
    readinessValid,
  ].filter(Boolean).length;
  return {
    evidence,
    checks,
    passedCount,
    score: passedCount / 4,
    passed: passedCount === 4,
  };
}
