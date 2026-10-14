export type LearningExperimentRow = { _id: string; _creationTime: number; key: string; value: string };

type MetricRecord = {
  key?: string;
  label?: string;
  baseline?: number;
  candidate?: number;
  unit?: string;
  direction?: "higher" | "lower";
  evidence?: string;
  status?: string;
};
type ExperimentRecord = {
  linkedManifestStrategy?: { id?: string; name?: string };
  metrics?: MetricRecord[];
  baselineSafetyPass?: boolean;
  candidateSafetyPass?: boolean;
  decision?: string;
};

export type StrategyComparisonSignal = {
  strategyId: string;
  strategyName: string;
  experimentCount: number;
  comparableMetricCount: number;
  improvedRuns: number;
  regressedRuns: number;
  inconclusiveRuns: number;
  metricSummary: string[];
  recommendation: string;
};

export function deriveStrategyComparisonSignals(rows: LearningExperimentRow[]): StrategyComparisonSignal[] {
  const groups = new Map<string, { name: string; records: ExperimentRecord[] }>();
  for (const row of rows) {
    try {
      const record = JSON.parse(row.value) as ExperimentRecord;
      const link = record.linkedManifestStrategy;
      if (!link?.id || !Array.isArray(record.metrics)) continue;
      const current = groups.get(link.id) ?? { name: link.name?.trim() || "Linked Manifest strategy", records: [] };
      current.records.push(record);
      groups.set(link.id, current);
    } catch { /* Ignore malformed legacy experiment records. */ }
  }

  return [...groups.entries()].flatMap(([strategyId, group]) => {
    const eligible = group.records.filter(record =>
      record.baselineSafetyPass === true &&
      record.candidateSafetyPass === true &&
      Array.isArray(record.metrics) &&
      record.metrics.length > 0 &&
      record.metrics.every(metric =>
        typeof metric.key === "string" &&
        typeof metric.baseline === "number" && Number.isFinite(metric.baseline) &&
        typeof metric.candidate === "number" && Number.isFinite(metric.candidate) &&
        typeof metric.unit === "string" && metric.unit.trim().length > 0 &&
        (metric.direction === "higher" || metric.direction === "lower") &&
        typeof metric.evidence === "string" && metric.evidence.trim().length >= 8
      )
    );
    const commonKeys = eligible[0]?.metrics?.map(metric => metric.key!) ?? [];
    const compatible = eligible.filter(record => {
      const byKey = new Map(record.metrics!.map(metric => [metric.key!, metric]));
      return commonKeys.every(key => {
        const first = eligible[0].metrics!.find(metric => metric.key === key)!;
        const next = byKey.get(key);
        return !!next && next.unit === first.unit && next.direction === first.direction;
      }) && record.metrics!.length === commonKeys.length;
    });
    const summaries = commonKeys.map(key => {
      const first = compatible[0]?.metrics?.find(metric => metric.key === key);
      if (!first) return null;
      let improved = 0;
      let regressed = 0;
      for (const record of compatible) {
        const metric = record.metrics!.find(item => item.key === key)!;
        const delta = metric.candidate! - metric.baseline!;
        const normalized = metric.direction === "higher" ? delta : -delta;
        if (normalized > 0.000001) improved++;
        else if (normalized < -0.000001) regressed++;
      }
      return { key, label: first.label || key, improved, regressed, runs: compatible.length };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const improvedRuns = compatible.filter(record => record.metrics!.some(metric => {
      const delta = metric.candidate! - metric.baseline!;
      return (metric.direction === "higher" ? delta : -delta) > 0.000001;
    }) && !record.metrics!.some(metric => {
      const delta = metric.candidate! - metric.baseline!;
      return (metric.direction === "higher" ? delta : -delta) < -0.000001;
    })).length;
    const regressedRuns = compatible.filter(record => record.metrics!.some(metric => {
      const delta = metric.candidate! - metric.baseline!;
      return (metric.direction === "higher" ? delta : -delta) < -0.000001;
    })).length;
    const inconclusiveRuns = group.records.length - compatible.length;
    let recommendation = "Insufficient comparable, evidence-backed runs. Collect more measurements under matching conditions.";
    if (compatible.length >= 2 && improvedRuns === compatible.length && regressedRuns === 0) {
      recommendation = "Repeated measured improvements observed. Review sample size, context, and evidence before any human-controlled reuse; this is not causal proof.";
    } else if (regressedRuns > 0) {
      recommendation = "At least one comparable run regressed. Inspect metric-level trade-offs and failure evidence before considering reuse.";
    } else if (compatible.length > 0) {
      recommendation = "Early or mixed signal only. Run another comparable experiment and inspect metric-level differences.";
    }
    return [{
      strategyId,
      strategyName: group.name,
      experimentCount: group.records.length,
      comparableMetricCount: summaries.length,
      improvedRuns,
      regressedRuns,
      inconclusiveRuns,
      metricSummary: summaries.map(item => `${item.label}: improved in ${item.improved}/${item.runs} run(s), regressed in ${item.regressed}/${item.runs}`),
      recommendation,
    }];
  });
}
