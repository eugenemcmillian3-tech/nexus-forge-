import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'

export const Route = createFileRoute('/roadmap')({ component: RoadmapPage })

const steps = [
  { state: 'DONE', title: 'Governance and ownership isolation', detail: 'Mission-scoped audit, incident, memory, artifact, verification and portfolio queries are protected by operator ownership checks.' },
  { state: 'DONE', title: 'Manifest backend foundation', detail: 'Provider routing, strategy parsing and Manifest persistence foundation are in the source repository with regression tests.' },
  { state: 'DONE', title: 'Incident recovery safeguards', detail: 'Completed missions stay terminal; escalated incidents require documented review before autonomous restart.' },
  { state: 'DONE', title: 'Dedicated roadmap route', detail: 'The route is registered in the generated TanStack route tree and the PR CI workflow passed.' },
  { state: 'DONE', title: 'Shared governed workspace shell', detail: 'Responsive shared layout, Overview and Roadmap navigation are live; unported destinations are clearly marked as queued.' },
  { state: 'DONE', title: 'Manifest Intelligence route', detail: 'Dedicated route merged in PR #25. PR CI run 38201352002 passed install, automated tests and production build; route is wired into workspace navigation and page metadata.' },
  { state: 'IN PROGRESS', title: 'Provider-backed strategy persistence', detail: 'PR #27 is merged and the live UI reports structured strategy count and parse status. Remaining gate: a real authenticated provider run must confirm records appear in the operator-scoped ledger; source and CI success alone are not runtime proof.' },
  { state: 'QUEUED', title: 'Dedicated route parity', detail: 'Complete remaining queued destinations as dedicated pages with ordered next steps, preserving the shared governed shell and existing approval controls.' },
  { state: 'QUEUED', title: 'End-to-end delivery evidence', detail: 'After route parity, run the full build/test/deployment/smoke-evidence loop and record verified outcomes.' },
]

function RoadmapPage() {
  return <WorkspaceLayout title="Master Roadmap" eyebrow="PROJECT CONTROL / DELIVERY PLAN">
    <div className="workspace-head mt-8"><div><div className="section-kicker">BUILD STATUS</div><h2>Verified progress</h2></div><span className="status-chip">ROUTE PARITY ACTIVE</span></div>
    <p className="hero-text">The roadmap tracks verified source and CI progress. Human approval and authentication remain governed controls; they are not being repeatedly re-tested without a relevant code change.</p>
    <div className="glass-card research-card p-5 mt-6">
      {steps.map((step, index) => <article className="workflow-step flex gap-4 py-4 border-b border-slate-800/10 last:border-b-0" key={step.title}>
        <span className="workflow-step-mark text-xs font-bold text-slate-500 pt-1">{String(index + 1).padStart(2, '0')}</span>
        <div className="workflow-step-copy flex-1"><strong>{step.title}</strong><p className="text-sm text-slate-600 mt-1">{step.detail}</p></div>
        <span className="workflow-step-state text-[10px] font-bold tracking-wider whitespace-nowrap">{step.state}</span>
      </article>)}
    </div>
    <div className="glass-card research-card p-5 mt-6"><div className="section-kicker">NEXT BUILD PRIORITY</div><h2 className="text-2xl font-bold mt-2">Verify a real Manifest provider-to-ledger run</h2><p className="hero-text">The route and persistence receipt are merged and live. Next, run synthesis in an authenticated operator session and verify structured strategy records appear in that operator’s private ledger. Do not mark runtime persistence verified from a build or parser test alone. Then continue dedicated route parity.</p><a className="ghost-button inline-flex mt-3" href="https://github.com/eugenemcmillian3-tech/nexus-forge-/actions" target="_blank" rel="noreferrer">View GitHub Actions ↗</a></div>
  </WorkspaceLayout>
}
