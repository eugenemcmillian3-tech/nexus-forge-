import { releaseAudit, releaseReady } from '../lib/production-readiness'

export function ProductionReleaseReadiness() {
  const ready = releaseReady(releaseAudit.gates)
  const recorded = releaseAudit.gates.filter(gate => gate.status === 'verified').length
  return <section className="glass-card research-card" id="production-release" aria-label="Production release checklist">
    <div className="panel-title"><span>PRODUCTION RELEASE CHECKLIST</span><span className="status-chip">{ready ? 'EVIDENCE COMPLETE' : 'RELEASE HOLD'}</span></div>
    <p>{releaseAudit.scope}</p>
    <p><strong>{recorded}/{releaseAudit.gates.length} evidence gates recorded.</strong> {ready ? 'Review the recorded release evidence.' : 'The site is live, but full production readiness is not signed off. Blocked and partial gates below remain open.'}</p>
    <p className="muted-copy">Dated audit: {releaseAudit.date}. Baseline commit {releaseAudit.baselineCommit.slice(0, 12)}. This snapshot is not live telemetry, an uptime guarantee or an automatic release approval.</p>
    <div className="hero-actions"><a className="secondary-button" href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/PRODUCTION_RELEASE_CHECKLIST.md" target="_blank" rel="noreferrer">Open release evidence and exit criteria ↗</a><a className="secondary-button" href="https://github.com/eugenemcmillian3-tech/nexus-forge-/actions/workflows/production-release.yml" target="_blank" rel="noreferrer">Open monitoring runs and reports ↗</a></div>
    {releaseAudit.gates.map(gate => <details key={gate.id}><summary>{gate.title} · {gate.status === 'verified' ? 'EVIDENCE RECORDED' : gate.status === 'blocked' ? 'BLOCKED' : 'MORE EVIDENCE NEEDED'}</summary><p>{gate.evidence}</p><p><strong>Exit criterion:</strong> {gate.exit}</p><a href={gate.reference} target="_blank" rel="noreferrer">Inspect evidence or recovery procedure ↗</a></details>)}
    <p>Retain accepted Research, Manifest and LocalBoost evidence. Authentication and approval setup are not repeated as a release checklist exercise. Deferred roadmap expansions are not launch prerequisites for this scoped release.</p>
  </section>
}
