import { createFileRoute, Link } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'

export const Route = createFileRoute('/roadmap')({ component: RoadmapPage })

const roadmap = [
  {
    "n": 1,
    "title": "Verify current live platform",
    "status": "partial",
    "detail": "Scoped source-difference audit completed; retain documented generated/compatibility differences. Broader runtime and workload validation remains."
  },
  {
    "n": 2,
    "title": "Finish Manifest Intelligence outcome system",
    "status": "partial",
    "detail": "Add world context, automatic outcome metrics, complete resource accounting, and measured adaptive improvement."
  },
  {
    "n": 3,
    "title": "Stabilize AI providers and routing",
    "status": "partial",
    "detail": "Validate provider reliability across workloads. OpenRouter remains manual-only; Mistral and Hugging Face are deferred."
  },
  {
    "n": 4,
    "title": "Build Unified Intelligence Orchestrator",
    "status": "partial",
    "detail": "Complete integrated orchestration runtime validation. Dependency/resource preflight, adaptive guidance, runner status, and documented escalation recovery are implemented in Mission Control."
  },
  {
    "n": 5,
    "title": "Add structured Intent Compiler",
    "status": "done",
    "detail": "Implemented: structured mission intent and acceptance contract."
  },
  {
    "n": 6,
    "title": "Competing strategies and task-aware model selection",
    "status": "partial",
    "detail": "Measure strategy comparisons and task-aware model selection against repeatable outcomes."
  },
  {
    "n": 7,
    "title": "Independent verification and safety",
    "status": "partial",
    "detail": "Artifact Forge supports browser-reported checks plus exact-snapshot Chromium CI and GitHub-verified step evidence. Broader acceptance, integration, and real-world outcome coverage remains open."
  },
  {
    "n": 8,
    "title": "Verified Learning Engine",
    "status": "partial",
    "detail": "Broaden verified learning evidence and benchmark coverage."
  },
  {
    "n": 9,
    "title": "Persistent, searchable knowledge",
    "status": "partial",
    "detail": "Owner-scoped memory browsing, content search, mission/category filters, pagination, and source receipts are implemented. Measure retrieval relevance, ranking quality, and reuse effectiveness."
  },
  {
    "n": 10,
    "title": "Connect missions to real-world outcomes",
    "status": "partial",
    "detail": "Ingest actual product and business outcomes beyond readiness receipts."
  },
  {
    "n": 11,
    "title": "Checkpoints and long-horizon execution",
    "status": "partial",
    "detail": "Validate checkpoint recovery and long-horizon reliability across repeated runs."
  },
  {
    "n": 12,
    "title": "Capability benchmark and experiment lab",
    "status": "partial",
    "detail": "Versioned artifact-dom-v1 fixtures run in a dedicated CI job with retained JSON reports. Broader capability, browser, integration, and experiment benchmarks remain open."
  },
  {
    "n": 13,
    "title": "Capability and Reliability Dashboard",
    "status": "partial",
    "detail": "Capability & Reliability now verifies GitHub benchmark job outcomes by repository, workflow, commit, and exact attempt. Broader measured capability and product outcomes remain open."
  },
  {
    "n": 14,
    "title": "Automated research and opportunity discovery",
    "status": "partial",
    "detail": "Improve discovery evidence quality and integrated research validation."
  },
  {
    "n": 15,
    "title": "Safe capability expansion",
    "status": "partial",
    "detail": "Add more capabilities with explicit tests and governed expansion evidence."
  },
  {
    "n": 16,
    "title": "Cost and resource intelligence",
    "status": "partial",
    "detail": "Automate per-run usage, cost collection, and resource intelligence; budgets and recorded costs already exist."
  },
  {
    "n": 17,
    "title": "Multimodal creation and perception",
    "status": "later",
    "detail": "Build multimodal creation and perception workflows."
  },
  {
    "n": 18,
    "title": "Product and venture delivery pipeline",
    "status": "partial",
    "detail": "Governed delivery and configurable artifact browser checks exist. Validate broader integrated behavior, external services, and actual product outcomes with independent evidence."
  },
  {
    "n": 19,
    "title": "Advanced security and resilience at scale",
    "status": "later",
    "detail": "Build advanced security and resilience capabilities for scale."
  },
  {
    "n": 20,
    "title": "Multi-user and enterprise governance",
    "status": "later",
    "detail": "Build multi-user workspaces and enterprise governance."
  },
  {
    "n": 21,
    "title": "External agent and developer ecosystem",
    "status": "later",
    "detail": "Build external agent integrations and a developer ecosystem."
  },
  {
    "n": 22,
    "title": "Competitive validation and genuine novelty",
    "status": "later",
    "detail": "Establish comparative benchmarks and evidence of useful novelty."
  },
  {
    "n": 23,
    "title": "Frontier scientific research",
    "status": "later",
    "detail": "Develop and evaluate frontier scientific research capabilities."
  },
  {
    "n": 24,
    "title": "AGI-oriented generality and superintelligence research",
    "status": "later",
    "detail": "Research broader generality with explicit evaluations. This is a research direction, not an implemented AGI or superintelligence claim."
  }
] as const

function RoadmapPage() {
  const done = roadmap.filter(item => item.status === 'done')
  const partial = roadmap.filter(item => item.status === 'partial')
  const deferred = roadmap.filter(item => item.status === 'later')
  return <WorkspaceLayout title="Project roadmap" eyebrow="NEXUS FORGE / PROGRESS"><section className="workspace dark-section">
    <div className="workspace-head"><div><div className="section-kicker">PROJECT / ROADMAP</div><h1>What shipped. What remains.</h1></div><span className="status-chip">24 MILESTONES</span></div>
    <p>The roadmap tracks complete capabilities. A working page or a passing test does not complete a whole milestone. All 16 workspaces remain in the guide; mission evidence follows its own checkpoints.</p>
    <div className="hero-actions"><Link className="primary-button" to="/workflow">Continue guided workflow →</Link><Link className="secondary-button" to="/evidence">Review research evidence →</Link><Link className="secondary-button" to="/incidents">Review recovery →</Link></div>
    <div className="stats-strip compact"><div><strong>{done.length}</strong><span>Completed milestone</span></div><div><strong>{partial.length}</strong><span>Partially implemented</span></div><div><strong>{deferred.length}</strong><span>Deferred / not implemented</span></div></div>
    <div className="glass-card research-card"><div className="panel-title"><span>NEXT WORK · FOUNDATION FIRST</span><span className="status-chip">IN PROGRESS</span></div>
      <ol><li>Broaden the criterion and benchmark corpus beyond the initial controlled examples and offline artifact interactions.</li><li>Evaluate memory retrieval relevance and strategy reuse effectiveness.</li><li>Extend real product outcome evidence beyond deployment readiness.</li></ol><p><a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/FEATURE_FUNCTION_REVIEW.md" target="_blank" rel="noreferrer">Review page functions, components, and remaining capability gaps →</a></p>
      <p>Dependency and resource preflight checks block execution in the backend. Mission Control displays blockers, advisories, and resource availability; authorization and execution wait for ready preflight and incident clearance.</p>
    </div>
    <div className="glass-card research-card"><div className="panel-title"><span>IMPLEMENTED FOUNDATION</span><span className="live-pill">SAVED EVIDENCE</span></div>
      <ul><li>All 16 pages share ordered guidance, selected-mission state, honest progress states, and recovery links. Council continues to Research & Memory; partial planning is recorded with lower confidence.</li><li>Source audit repairs align runner delivery reads, repository/branch preflight, destination-specific preparation, shared sign-out recovery, intent parsing, metadata, and readiness wording. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/SOURCE_AUDIT.md" target="_blank" rel="noreferrer">Review the audit scope and retained differences →</a></li><li>Mission drafts retain owner-checked Manifest, Orchestrator, and reviewed-learning provenance.</li><li>Artifact Forge can explicitly publish an exact saved artifact/mission/test-plan snapshot to a dedicated CI branch, run isolated Chromium, and import digest/commit/attempt-bound GitHub Check evidence. Approval and delivery remain separate. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/EXACT_ARTIFACT_CI.md" target="_blank" rel="noreferrer">Review exact-snapshot CI workflow →</a></li><li>Capability & Reliability includes six repeatable DOM benchmark cases, CI JSON reports, and operator-private receipts verified against GitHub job metadata. These fixture results do not certify generated artifacts. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/BENCHMARK_CI_EVIDENCE.md" target="_blank" rel="noreferrer">Review CI benchmark evidence and scope →</a></li><li>Research & Memory now exposes saved context through private content search, selected-mission/all-owned scope, category filters, paginated records, and source/confidence receipts. Retrieval effectiveness remains under evaluation.</li><li>Artifact generation receives saved mission requirements and mission-specific research; delivery requires an explicitly selected approved artifact.</li><li>Artifact Forge supports fill/click/assertion plans tied to saved acceptance criteria, isolated execution, per-step observed evidence, coverage, reusable plans, and exact mission/artifact snapshots. Reports remain client-reported and do not change approvals or delivery state. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/ARTIFACT_BROWSER_CHECKS.md" target="_blank" rel="noreferrer">Review browser check usage and limits →</a></li><li>Artifact re-verification preserves valid approval. Dispatch state cannot be rewound by approval, and matching callbacks are idempotent while conflicting receipts are rejected.</li><li>Mission Control includes adaptive learning guidance, saved runner status/errors, provider diagnostics, and documented escalation review. Review writes an audit receipt without automatically restarting execution.</li><li>Measured outcome recording and action-error recovery are available. Seven mission pages wait for evidence before showing missing-record guidance.</li><li>Readiness counts and HTTP callback types are validated; provider descriptions match routing policy.</li></ul>
      <p>Research, Manifest, and the earlier LocalBoost delivery have accepted live receipts. These are retained evidence, not a requirement to repeat authentication or approvals for routine maintenance. Manifest receipt: manifest:kh7a55xqfcg63ezf8w8rr770bs8g84w3, with three linked strategy records.</p>
    </div>
    {[
      { title: 'Not implemented yet · deferred expansions', items: deferred },
      { title: 'Partially implemented · remaining work', items: partial },
      { title: 'Completed milestone', items: done },
    ].map(group => <div className="glass-card research-card" key={group.title}><h2>{group.title}</h2>{group.items.map(item => <div className="guard-item" key={item.n}><span>{item.n}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><span className="status-chip">{item.status === 'later' ? 'DEFERRED' : item.status === 'done' ? 'COMPLETE' : 'PARTIAL'}</span></div>)}</div>)}
    <p className="muted-copy">Implementation history remains in GitHub pull requests. This page describes the current capability gaps rather than repeating superseded status notes.</p>
  </section></WorkspaceLayout>
}
