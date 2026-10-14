export type ManifestStrategyOutcomeRow = {
  _id: string;
  key: string;
  value: string;
};

export type ManifestOutcomeSignal = {
  id: string;
  name: string;
  strategyKey: string;
  blueprintKey: string | null;
  status: string;
  result: string;
  evidence: string;
  cost: number | null;
  recordedAt: number | null;
  outcomeCount: number;
  recommendation: string;
};

type OutcomeEntry = {
  outcomeStatus?: string;
  actualResult?: string;
  evidence?: string;
  actualCost?: number | null;
  recordedAt?: number;
};

export function deriveManifestOutcomeSignals(rows: ManifestStrategyOutcomeRow[]): ManifestOutcomeSignal[] {
  return rows.flatMap((row) => {
    try {
      const record = JSON.parse(row.value) as {
        name?: string;
        outcomeStatus?: string;
        actualResult?: string;
        evidence?: string;
        actualCost?: number | null;
        recordedAt?: number | null;
        outcomeHistory?: OutcomeEntry[];
      };
      const history = Array.isArray(record.outcomeHistory) ? record.outcomeHistory : [];
      const outcomes = history.length ? history : [record];
      const measured = outcomes.filter((item) =>
        typeof item.actualResult === "string" &&
        item.actualResult.trim().length >= 3 &&
        typeof item.evidence === "string" &&
        item.evidence.trim().length >= 3
      );
      const latest = measured[measured.length - 1];
      if (!latest) return [];
      const status = typeof latest.outcomeStatus === "string" ? latest.outcomeStatus : "inconclusive";
      const allRecordedStatuses = measured.map(item => item.outcomeStatus ?? "inconclusive");
      let recommendation = "Inconclusive signal: improve measurement quality or sample size before deciding.";
      if (status === "failed") {
        recommendation = "Failure signal: review the failure evidence and change the approach before repeating.";
      } else if (status === "partial") {
        recommendation = "Partial signal: narrow the unresolved assumptions and run a comparable follow-up.";
      } else if (status === "succeeded" && measured.length >= 2 && allRecordedStatuses.every(value => value === "succeeded")) {
        recommendation = "Repeated success signal: compare against a baseline before reuse; this is not causal proof.";
      } else if (status === "succeeded") {
        recommendation = "Single success signal: seek a second comparable run and compare against a baseline.";
      }
      const strategySeparator = ":strategy:";
      const separatorIndex = row.key.indexOf(strategySeparator);
      return [{
        id: row._id,
        name: typeof record.name === "string" && record.name.trim() ? record.name : row.key,
        strategyKey: row.key,
        blueprintKey: separatorIndex > 0 ? row.key.slice(0, separatorIndex) : null,
        status,
        result: latest.actualResult!.trim(),
        evidence: latest.evidence!.trim(),
        cost: typeof latest.actualCost === "number" && Number.isFinite(latest.actualCost) ? latest.actualCost : null,
        recordedAt: typeof latest.recordedAt === "number" && Number.isFinite(latest.recordedAt) ? latest.recordedAt : null,
        outcomeCount: measured.length,
        recommendation,
      }];
    } catch {
      return [];
    }
  });
}
