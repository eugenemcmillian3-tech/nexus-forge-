export type MissionStrategy = {
  name: string;
  rationale: string;
  tradeoff: string;
  expectedOutcome: string;
};

export type MissionSpecification = {
  objective: string;
  constraints: string[];
  dependencies: string[];
  acceptanceCriteria: string[];
  risks: string[];
  deadline: string;
  strategies: MissionStrategy[];
  recommendedStrategy: number;
};

const stringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object found");
  const candidate = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    throw new Error("Invalid JSON object");
  }
}

/** Parse, bound, and validate untrusted model output before persistence or execution. */
export function parseMissionSpecification(raw: string): MissionSpecification {
  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    throw new Error("The selected AI provider did not return a valid mission-spec JSON object. Retry once or check provider health.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The compiler returned an invalid mission specification.");
  }
  const candidate = parsed as Record<string, unknown>;
  const validStrategies = Array.isArray(candidate.strategies) && candidate.strategies.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const entry = item as Record<string, unknown>;
    return ["name", "rationale", "tradeoff", "expectedOutcome"].every((key) => typeof entry[key] === "string");
  });

  if (
    typeof candidate.objective !== "string" ||
    typeof candidate.deadline !== "string" ||
    !stringList(candidate.constraints) ||
    !stringList(candidate.dependencies) ||
    !stringList(candidate.acceptanceCriteria) ||
    !stringList(candidate.risks) ||
    !validStrategies ||
    typeof candidate.recommendedStrategy !== "number"
  ) {
    throw new Error("The compiler response is missing required mission contract fields. Retry or check provider health.");
  }

  const candidateStrategies = candidate.strategies as Array<Record<string, string>>;
  const result: MissionSpecification = {
    objective: candidate.objective.trim().slice(0, 2000),
    constraints: candidate.constraints.slice(0, 10).map((item) => item.trim().slice(0, 500)).filter(Boolean),
    dependencies: candidate.dependencies.slice(0, 10).map((item) => item.trim().slice(0, 500)).filter(Boolean),
    acceptanceCriteria: candidate.acceptanceCriteria.slice(0, 10).map((item) => item.trim().slice(0, 500)).filter(Boolean),
    risks: candidate.risks.slice(0, 10).map((item) => item.trim().slice(0, 500)).filter(Boolean),
    deadline: candidate.deadline.trim().slice(0, 120),
    strategies: candidateStrategies.slice(0, 3).map((item) => {
      const entry = item as Record<string, string>;
      return {
        name: entry.name.trim().slice(0, 160),
        rationale: entry.rationale.trim().slice(0, 500),
        tradeoff: entry.tradeoff.trim().slice(0, 500),
        expectedOutcome: entry.expectedOutcome.trim().slice(0, 500),
      };
    }),
    recommendedStrategy: candidate.recommendedStrategy,
  };

  if (result.objective.length < 8) throw new Error("The compiler returned an empty or unusably short objective.");
  if (!result.deadline) throw new Error("The compiler did not define a deadline or time horizon.");
  if (result.acceptanceCriteria.length === 0) throw new Error("The mission contract needs at least one acceptance criterion.");
  if (result.strategies.length < 2 || result.strategies.length > 3) {
    throw new Error("The compiler must return 2–3 competing strategies.");
  }
  if (result.strategies.some((strategy) => !strategy.name || !strategy.rationale || !strategy.expectedOutcome)) {
    throw new Error("Every competing strategy must include a name, rationale, and expected outcome.");
  }
  if (new Set(result.strategies.map((strategy) => strategy.name.toLowerCase())).size !== result.strategies.length) {
    throw new Error("Competing strategies must be meaningfully distinguishable by name.");
  }
  if (!Number.isInteger(result.recommendedStrategy) || result.recommendedStrategy < 0 || result.recommendedStrategy >= result.strategies.length) {
    throw new Error("The compiler returned an invalid recommended strategy index.");
  }

  return result;
}
