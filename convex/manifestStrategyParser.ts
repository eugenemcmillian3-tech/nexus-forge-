export type ManifestStrategyCandidate = { name: string; mechanism: string; prerequisites: string; timeToEvidence: string; expectedValue: string; reversibility: string; failureMode: string; unverifiedAssumptions: string; };
export type ManifestStrategyExtraction = { blueprint: string; strategies: ManifestStrategyCandidate[]; foundBlock: boolean; validJson: boolean; };
const fields = ["name", "mechanism", "prerequisites", "timeToEvidence", "expectedValue", "reversibility", "failureMode", "unverifiedAssumptions"] as const;
/** Parse optional, untrusted model-generated strategy JSON without losing the readable blueprint. */
export function extractManifestStrategies(generated: string): ManifestStrategyExtraction {
  const fence = String.fromCharCode(96).repeat(3);
  const pattern = new RegExp(fence + "(?:manifest-strategies|json)\\s*([\\s\\S]*?)\\s*" + fence, "i");
  const match = pattern.exec(generated);
  const trimmed = generated.trim();
  const rawArray = !match && trimmed.startsWith("[") && trimmed.endsWith("]");
  if (!match && !rawArray) return { blueprint: trimmed, strategies: [], foundBlock: false, validJson: false };
  const payload = match ? match[1] : trimmed;
  let parsed: unknown;
  try { parsed = JSON.parse(payload); } catch { return { blueprint: match ? generated.replace(match[0], "").trim() : trimmed, strategies: [], foundBlock: true, validJson: false }; }
  if (!Array.isArray(parsed)) return { blueprint: match ? generated.replace(match[0], "").trim() : trimmed, strategies: [], foundBlock: true, validJson: false };
  const strategies = parsed.slice(0, 3).filter((item): item is ManifestStrategyCandidate => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return fields.every((field) => typeof record[field] === "string" && (record[field] as string).trim().length > 0);
  }).map((item) => Object.fromEntries(fields.map((field) => [field, item[field].trim().slice(0, 1000)])) as unknown as ManifestStrategyCandidate);
  return { blueprint: match ? generated.replace(match[0], "").trim() : "", strategies, foundBlock: true, validJson: strategies.length > 0 };
}