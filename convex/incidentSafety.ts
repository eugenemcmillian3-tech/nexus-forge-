export function missionIsAlreadyComplete(status: string | undefined): boolean {
  return status === "complete";
}

export function directStartBlock(): string {
  return "Direct mission start is disabled. Use Mission Control's governed Execute Approved Mission action, which checks the matching human decision, dependencies, resources, and escalations.";
}

export function unresolvedEscalationBlock(incidents: ReadonlyArray<{ status: string; stage: string }>): string | null {
  const incident = incidents.find((row) => row.status === "escalated");
  if (!incident) return null;
  return `Autonomous restart blocked: the ${incident.stage.replaceAll("_", " ")} incident requires documented human review and resolution first.`;
}
