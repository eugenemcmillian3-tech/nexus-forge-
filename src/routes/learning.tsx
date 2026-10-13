import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { WorkspaceLayout } from "../components/workspace-layout";

export const Route = createFileRoute("/learning")({ component: LearningEnginePage });

type MetricDraft = {
  key: string;
  label: string;
  baseline: number;
  candidate: number;
  unit: string;
  direction: "higher" | "lower";
  evidence: string;
};

type SavedExperiment = { _id: string; _creationTime: number; key: string; value: string; confidence: number; source: string };

const initialMetrics: MetricDraft[] = [
  { key: "quality", label: "Quality score", baseline: 70, candidate: 72, unit: "score / 100", direction: "higher", evidence: "" },
  { key: "completion", label: "Task completion rate", baseline: 70, candidate: 75, unit: "%", direction: "higher", evidence: "" },
  { key: "runtime", label: "Runtime", baseline: 30, candidate: 28, unit: "minutes", direction: "lower", evidence: "" },
  { key: "cost", label: "Run cost", baseline: 4, candidate: 3.5, unit: "USD", direction: "lower", evidence: "" },
];

function LearningEnginePage() {
  const recordExperiment = useMutation(api.learningEngine.recordExperiment);
  const savedRows = useQuery(api.learningEngine.listExperiments, {});
  const manifestRows = useQuery(api.manifestIntelligence.listStrategies, {});
  const [name, setName] = useState("Strategy comparison");
  const [hypothesis, setHypothesis] = useState("The candidate strategy improves output quality and completion without increasing runtime or cost.");
  const [baselineLabel, setBaselineLabel] = useState("Current baseline");
  const [candidateLabel, setCandidateLabel] = useState("Candidate strategy");
  const [metrics, setMetrics] = useState<MetricDraft[]>(initialMetrics);
  const [baselineSafetyPass, setBaselineSafetyPass] = useState(false);
  const [candidateSafetyPass, setCandidateSafetyPass] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ decision: string; rationale: string; improved: number; regressed: number; unchanged: number } | null>(null);

  const updateMetric = (index: number, field: keyof MetricDraft, value: string | number) => {
    setMetrics(current => current.map((metric, i) => i === index ? { ...metric, [field]: value } : metric));
  };

  const submit = async () => {
    setError("");
    setReceipt(null);
    if (metrics.some(metric => metric.evidence.trim().length < 8)) {
      setError("Add a measurement source, run ID, artifact reference, or a short explanation for every metric.");
      return;
    }
    setBusy(true);
    try {
      const result = await recordExperiment({
        name, hypothesis, baselineLabel, candidateLabel, metrics,
        baselineSafetyPass, candidateSafetyPass, notes,
      });
      setReceipt(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record this experiment.");
    } finally {
      setBusy(false);
    }
  };

  const history = (savedRows ?? []) as SavedExperiment[];
  return <WorkspaceLayout title="Verified Learning Engine" eyebrow="STAGE 04 / MEASURE → COMPARE → REVIEW">
    <section className="workspace">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span /> EVIDENCE-LED IMPROVEMENT</div>
          <h2>Improve from <em>measured outcomes.</em></h2>
          <p className="hero-text">Compare a baseline with a candidate using the same metrics. The engine computes the result deterministically, stores the evidence references, and recommends review only when the stated conditions are met.</p>
          <div className="hero-actions"><Link className="secondary-button" to="/orchestrator">Intelligence Orchestrator →</Link><Link className="secondary-button" to="/evidence">Research & Memory →</Link></div>
        </div>
        <div className="glass-card research-card">
          <div className="panel-title"><span>LEARNING GUARDRAILS</span><span className="live-pill">HUMAN CONTROL</span></div>
          {["Compare the same metrics", "Require evidence references", "Flag safety regressions", "Persist each experiment", "Never auto-promote a candidate"].map((item, i) => <div className="decision-line" key={item}><span>0{i + 1}</span><strong>{item}</strong></div>)}
          <p className="muted-copy">Evidence links and notes are operator-provided until independently checked. A recorded result is not proof by itself.</p>
        </div>
      </div>

      <div className="glass-card research-card">
        <div className="panel-title"><span>BASELINE VS CANDIDATE</span><span className="live-pill">CONTROLLED COMPARISON</span></div>
        <label htmlFor="learning-name">EXPERIMENT NAME</label>
        <input id="learning-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} />
        <label htmlFor="learning-hypothesis">TESTABLE HYPOTHESIS</label>
        <textarea id="learning-hypothesis" rows={3} value={hypothesis} maxLength={1200} onChange={e => setHypothesis(e.target.value)} />
        <div className="field-grid">
          <div><label htmlFor="learning-baseline">BASELINE LABEL</label><input id="learning-baseline" value={baselineLabel} maxLength={100} onChange={e => setBaselineLabel(e.target.value)} /></div>
          <div><label htmlFor="learning-candidate">CANDIDATE LABEL</label><input id="learning-candidate" value={candidateLabel} maxLength={100} onChange={e => setCandidateLabel(e.target.value)} /></div>
        </div>
        <div className="panel-title"><span>COMPARABLE METRICS</span><span className="status-chip">EDIT WITH REAL MEASUREMENTS</span></div>
        <p className="muted-copy">Example values are placeholders. Replace them with observations from comparable runs before saving.</p>
        {metrics.map((metric, index) => <div className="glass-card research-card" key={metric.key}>
          <div className="panel-title"><strong>{metric.label}</strong><span className="status-chip">{metric.direction === "higher" ? "HIGHER IS BETTER" : "LOWER IS BETTER"}</span></div>
          <div className="field-grid">
            <div><label htmlFor={`learning-base-${metric.key}`}>{baselineLabel || "Baseline"} · {metric.unit}</label><input id={`learning-base-${metric.key}`} type="number" step="any" value={metric.baseline} onChange={e => updateMetric(index, "baseline", Number(e.target.value))} /></div>
            <div><label htmlFor={`learning-cand-${metric.key}`}>{candidateLabel || "Candidate"} · {metric.unit}</label><input id={`learning-cand-${metric.key}`} type="number" step="any" value={metric.candidate} onChange={e => updateMetric(index, "candidate", Number(e.target.value))} /></div>
          </div>
          <label htmlFor={`learning-evidence-${metric.key}`}>EVIDENCE REFERENCE / MEASUREMENT METHOD</label>
          <input id={`learning-evidence-${metric.key}`} value={metric.evidence} maxLength={1000} placeholder="Run ID, artifact link, report URL, or how this was measured" onChange={e => updateMetric(index, "evidence", e.target.value)} />
        </div>)}
        <div className="panel-title"><span>SAFETY GATE</span><span className="status-chip">BOTH REQUIRED</span></div>
        <label className="decision-line"><input type="checkbox" checked={baselineSafetyPass} onChange={e => setBaselineSafetyPass(e.target.checked)} /> Baseline safety checks passed</label>
        <label className="decision-line"><input type="checkbox" checked={candidateSafetyPass} onChange={e => setCandidateSafetyPass(e.target.checked)} /> Candidate safety checks passed</label>
        <label htmlFor="learning-notes">NOTES / LIMITATIONS</label>
        <textarea id="learning-notes" rows={3} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sample size, test conditions, known limitations, or unresolved questions" />
        <button className="primary-button" disabled={busy} onClick={() => void submit()}>{busy ? "Recording experiment…" : "Record comparison ↗"}</button>
        {error && <p className="warning" role="alert">{error}</p>}
        {receipt && <div className="glass-card research-card" role="status"><div className="panel-title"><span>COMPARISON RECEIPT</span><span className="live-pill">{receipt.decision.toUpperCase()}</span></div><p>{receipt.rationale}</p><p>Improved: {receipt.improved} · Regressed: {receipt.regressed} · Unchanged: {receipt.unchanged}</p><strong>Saved to private learning memory. No strategy was promoted.</strong></div>}
      </div>

      <div className="glass-card research-card">
        <div className="panel-title"><span>MANIFEST OUTCOME SIGNALS</span><span className="live-pill">{(manifestRows ?? []).filter(row => { try { const record = JSON.parse(row.value); return Array.isArray(record.outcomeHistory) && record.outcomeHistory.length > 0 || typeof record.recordedAt === "number" && typeof record.actualResult === "string" && record.actualResult.length > 0; } catch { return false; } }).length} MEASURED STRATEGIES</span></div>
        <p className="muted-copy">This panel reads your private Manifest strategy ledger. Only recorded observations are counted; generated expectations are not treated as results.</p>
        {manifestRows === undefined ? <p>Loading Manifest outcome signals…</p> : (() => {
          const measured = manifestRows.flatMap(row => {
            try {
              const record = JSON.parse(row.value) as { name?: string; outcomeStatus?: string; actualResult?: string; evidence?: string; actualCost?: number | null; recordedAt?: number | null; outcomeHistory?: Array<{ outcomeStatus?: string; actualResult?: string; evidence?: string; actualCost?: number | null; recordedAt?: number }>; };
              const history = Array.isArray(record.outcomeHistory) ? record.outcomeHistory : [];
              const latest = history.length ? history[history.length - 1] : record;
              if (typeof latest.actualResult !== "string" || latest.actualResult.trim().length === 0) return [];
              return [{ id: row._id, name: record.name ?? row.key, status: latest.outcomeStatus ?? "inconclusive", result: latest.actualResult, evidence: latest.evidence ?? "Evidence not recorded", cost: latest.actualCost, recordedAt: latest.recordedAt }];
            } catch { return []; }
          });
          const succeeded = measured.filter(item => item.status === "succeeded").length;
          const partial = measured.filter(item => item.status === "partial").length;
          const failed = measured.filter(item => item.status === "failed").length;
          const inconclusive = measured.filter(item => item.status === "inconclusive").length;
          return measured.length === 0
            ? <div className="empty-state"><h3>No measured Manifest outcomes yet</h3><p>Record an observed result and evidence in Manifest Intelligence. Those records will appear here automatically.</p><Link className="secondary-button" to="/manifest">Open Manifest Intelligence →</Link></div>
            : <>
              <div className="field-grid">
                <div className="decision-line"><span>✓</span><strong>{succeeded} succeeded</strong></div>
                <div className="decision-line"><span>↗</span><strong>{partial} partial</strong></div>
                <div className="decision-line"><span>!</span><strong>{failed} failed</strong></div>
                <div className="decision-line"><span>…</span><strong>{inconclusive} inconclusive</strong></div>
              </div>
              {failed > 0 ? <p className="warning">Learning signal: review failed strategies and their recorded failure evidence before repeating them. This is a review cue, not an automatic strategy change.</p> : succeeded > 0 && failed === 0 && inconclusive === 0 ? <p className="muted-copy">Learning signal: recorded successes are available for comparison. Confirm the evidence and compare against a baseline before reuse.</p> : <p className="muted-copy">Learning signal: collect additional comparable measurements before drawing a strong conclusion.</p>}
              {measured.slice(0, 8).map(item => <article className="portfolio-row" key={item.id}><div className="portfolio-main"><strong>{item.name}</strong><p>{item.result}</p><small>Status: {item.status} · Evidence: {item.evidence}{item.cost == null ? "" : ` · Actual cost: ${item.cost}`}</small></div><div className="portfolio-cell"><small>RECORDED</small><b>{typeof item.recordedAt === "number" ? new Date(item.recordedAt).toLocaleDateString() : "DATE N/A"}</b></div></article>)}
              <Link className="secondary-button" to="/manifest">Review strategy ledger →</Link>
            </>;
        })()}
      </div>

      <div className="glass-card research-card">
        <div className="panel-title"><span>RECENT EXPERIMENTS</span><span className="live-pill">{history.length} SAVED</span></div>
        {savedRows === undefined ? <p>Loading experiment history…</p> : history.length === 0 ? <div className="empty-state"><h3>No experiments recorded yet</h3><p>Use real baseline and candidate observations to establish the first comparable record.</p></div> : history.map(row => {
          let record: any = null;
          try { record = JSON.parse(row.value); } catch { /* ignore malformed historical record */ }
          return <article className="portfolio-row" key={row._id}><div className="portfolio-main"><strong>{record?.name ?? row.key}</strong><p>{record?.hypothesis ?? "Stored experiment record"} · {record?.baselineLabel ?? "Baseline"} → {record?.candidateLabel ?? "Candidate"}</p><p>{record?.rationale ?? "No recommendation summary saved."}</p><small>Evidence status: {record?.evidenceStatus ?? "not specified"} · {new Date(row._creationTime).toLocaleString()}</small></div><div className="portfolio-cell"><small>DECISION</small><b>{String(record?.decision ?? "stored").toUpperCase()}</b></div></article>;
        })}
      </div>
    </section>
  </WorkspaceLayout>;
}
