import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'

export const Route = createFileRoute('/roadmap')({ component: RoadmapPage })

const steps = [
  { state: 'DONE', title: 'Governance and ownership isolation', detail: 'Mission-scoped audit, incident, memory, artifact, verification and portfolio queries are protected by operator ownership checks.' },
  { state: 'DONE', title: 'Manifest backend foundation', detail: 'Provider routing, strategy parsing and Manifest persistence foundation are in the source repository with regression tests.' },
  { state: 'DONE', title: 'Incident recovery safeguards', detail: 'Completed missions stay terminal; escalated incidents require documented review before autonomous restart.' },
  { state: 'DONE', title: 'Dedicated roadmap route', detail: 'The route is registered in the generated TanStack route tree and the PR CI workflow passed.' },
  { state: 'DONE', title: 'Shared governed workspace shell', detail: 'Responsive shared layout, Overview and Roadmap navigation are implemented. Existing dedicated destinations use the shared governed shell.' },
  { state: 'DONE', title: 'Manifest Intelligence route', detail: 'Dedicated route merged in PR #25. PR CI run 38201352002 passed install, automated tests and production build; route is wired into workspace navigation and page metadata.' },
  { state: 'IN PROGRESS', title: 'Provider-backed strategy persistence', detail: 'PR #27 is merged and the synthesis receipt reports structured strategy count and parse status. A real authenticated provider run must still confirm records appear in the operator-scoped ledger; source and CI success alone are not runtime proof.' },
  { state: 'IN PROGRESS', title: 'Dedicated route parity', detail: 'GitHub main currently has only Overview, Manifest Intelligence, and Roadmap as actual routes; the remaining workspace destinations are intentionally labeled queued in the sidebar. Macaly production has the dedicated route set, including Autonomous Workflow guidance and the Mission Console next-step guide. These Macaly-only UI changes are not yet mirrored in this source repository. Port each route in dependency-aware slices with CI; do not mark parity complete until route registration, behavior, and tests are present here.' },
  { state: 'NEXT', title: 'Dependency-aware route parity', detail: 'Port Macaly-only behavior in focused slices, starting with Council route and backend dependencies. The latest Macaly Council fix marks partial results when specialist agents are blocked, lowers decision evidence confidence, and warns operators before downstream execution. Keep source and runtime behavior explicitly reconciled.' },
  { state: 'QUEUED', title: 'End-to-end delivery evidence', detail: 'Verify one fresh governed delivery with matching workflow and deployment provenance, canonical live URL smoke checks, and passing readiness evidence. A successful build alone is not completion.' },
]

function RoadmapPage() {
  return <WorkspaceLayout title="Master Roadmap" eyebrow="PROJECT CONTROL / DELIVERY PLAN">
    <div className="workspace-head mt-8"><div><div className="section-kicker">BUILD STATUS</div><h2>Verified progress</h2></div><span className="status-chip">FEATURE AUDIT ACTIVE</span></div>
    <p className="hero-text">The roadmap separates implementation from runtime proof. Human approval and authentication remain governed controls and are not repeatedly re-tested without a relevant code change.</p>
    <div className="glass-card research-card p-5 mt-6">
      {steps.map((step, index) => <article className="workflow-step flex gap-4 py-4 border-b border-slate-800/10 last:border-b-0" key={step.title}>
        <span className="workflow-step-mark text-xs font-bold text-slate-500 pt-1">{String(index + 1).padStart(2, '0')}</span>
        <div className="workflow-step-copy flex-1"><strong>{step.title}</strong><p className="text-sm text-slate-600 mt-1">{step.detail}</p></div>
        <span className="workflow-step-state text-[10px] font-bold tracking-wider whitespace-nowrap">{step.state}</span>
      </article>)}
    </div>
    <div className="glass-card research-card p-5 mt-6"><div className="section-kicker">NEXT BUILD PRIORITY</div><h2 className="text-2xl font-bold mt-2">Audit feature behavior page by page</h2><p className="hero-text">Page-by-page feature audit remains active. Correction from the current source tree: GitHub main contains `src/routes/council.tsx`, and `src/routeTree.gen.ts` registers `/council`; the earlier claim that the Council route was absent was stale. Comparing the current Macaly and GitHub Council implementations confirms both contain partial-result handoff messaging and a distinct warning if the secondary learning-memory write fails, so that behavior is not a new porting task. Do not duplicate existing route/backend work; investigate Council only if a concrete behavioral gap or regression is found. Runtime gates remain: one authenticated production Manifest synthesis must confirm structured strategies in the operator's private ledger, and a fresh delivery must prove matching workflow/deployment provenance plus canonical readiness. Preserve proven auth and human-approval flows without routine retesting.</p><a className="ghost-button inline-flex mt-3" href="https://github.com/eugenemcmillian3-tech/nexus-forge-/actions" target="_blank" rel="noreferrer">View GitHub Actions ↗</a></div>
  </WorkspaceLayout>
}
