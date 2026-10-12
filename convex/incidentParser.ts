export type ParsedIncidentDiagnosis = { diagnosis: string; proposedRecovery: string; confidence: number };

export function parseIncidentDiagnosis(text: string): ParsedIncidentDiagnosis {
  const confidenceMatch = text.match(/CONFIDENCE\s*[:\n]\s*(0(?:\.\d+)?|1(?:\.0+)?)(?![\d.])/i);
  const confidence = confidenceMatch ? Number(confidenceMatch[1]) : 0;
  const diagnosis = text.match(/DIAGNOSIS\s*[:\n]\s*([\s\S]*?)(?=\n\s*PROPOSED RECOVERY|$)/i)?.[1]?.trim() || "Insufficient evidence.";
  const proposedRecovery = text.match(/PROPOSED RECOVERY\s*[:\n]\s*([\s\S]*?)(?=\n\s*CONFIDENCE|$)/i)?.[1]?.trim() || "Human investigation required.";
  return { diagnosis, proposedRecovery, confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0 };
}
