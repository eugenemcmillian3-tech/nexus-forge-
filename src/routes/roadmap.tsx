import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/roadmap')({ component: RoadmapPage })

const steps = [
  { state: 'DONE', title: 'Governance and ownership isolation', detail: 'Mission-scoped audit, incident, memory, artifact, verification and portfolio queries are protected by operator ownership checks.' },
  { state: 'DONE', title: 'Manifest backend foundation', detail: 'Provider routing, strategy parsing and Manifest persistence foundation are in the source repository with regression tests.' },
  { state: 'DONE', title: 'Incident recovery safeguards', detail: 'Completed missions stay terminal; escalated incidents require documented review before autonomous restart.' },
  { state: 'NEXT', title: 'Dedicated route and workspace parity', detail: 'Add the workspace shell and register dedicated routes in dependency-aware slices without overwriting the working overview.' },
  { state: 'QUEUED', title: 'Port remaining feature pages', detail: 'Bring Mission Console, Council, Manifest Intelligence, Evidence, Artifact Forge, Delivery, Portfolio, Incidents, Providers, Readiness and Workflow pages across with their required APIs.' },
  { state: 'QUEUED', title: 'Provider-backed strategy persistence', detail: 'Verify strategy output is produced by a healthy provider, saved with operator scope, and tied to outcome evidence.' },
  { state: 'QUEUED', title: 'End-to-end delivery evidence', detail: 'After route parity, run the full build/test/deployment/smoke-evidence loop and record verified outcomes.' },
]

function RoadmapPage() {
  return <main className="min-h-screen nexus-shell">
    <header className="topbar">
      <Link to="/" className="brand-lockup"><div className="brand-mark">N</div><div><div className="brand-name">NEXUS FORGE</div><div className="brand-sub">GOVERNED INTELLIGENCE OS</div></div></Link>
      <div className="top-actions"><span className="live-pill"><span className="pulse-dot" /> ROADMAP</span><Link to="/" className="ghost-button">Back to overview ↗</Link></div>
    </header>
    <section className="workspace">
      <div className="workspace-head"><div><div className="section-kicker">PROJECT CONTROL / DELIVERY PLAN</div><h1>Master Roadmap</h1></div><span className="status-chip">ROUTE PARITY ACTIVE</span></div>
      <p className="hero-text">The roadmap tracks verified source and CI progress. Human approval and authentication remain governed controls; they are not being repeatedly re-tested without a relevant code change.</p>
      <div className="glass-card research-card">
        {steps.map((step, index) => <article className="workflow-step" key={step.title}>
          <span className="workflow-step-mark">{String(index + 1).padStart(2, '0')}</span>
          <div className="workflow-step-copy"><strong>{step.title}</strong><p>{step.detail}</p></div>
          <span className="workflow-step-state">{step.state}</span>
        </article>)}
      </div>
      <div className="glass-card research-card"><div className="section-kicker">NEXT BUILD PRIORITY</div><h2>Port the shared workspace shell and generated route tree</h2><p>Keep the change on a feature branch, wire one dependency-complete route at a time, and require automated tests plus a production build before merging.</p><a className="ghost-button" href="https://github.com/eugenemcmillian3-tech/nexus-forge-/actions" target="_blank" rel="noreferrer">View GitHub Actions ↗</a></div>
    </section>
  </main>
}
