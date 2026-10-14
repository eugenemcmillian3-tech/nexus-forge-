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
    "detail": "Reviewed-lesson handoffs now link to matched earlier/later cost, readiness and product observations with immutable receipts. Broader verified evidence, repeated comparisons and product outcomes remain open."
  },
  {
    "n": 9,
    "title": "Persistent, searchable knowledge",
    "status": "partial",
    "detail": "Private memory search and saved top-five retrieval comparisons are implemented with server-observed rankings and operator relevance labels. Council now captures actual selected memory IDs/rendered learning-preflight text for future planner attempts and supports operator-labeled evaluation. Representative labels, candidate policies and reuse effectiveness remain open."
  },
  {
    "n": 10,
    "title": "Connect missions to real-world outcomes",
    "status": "partial",
    "detail": "Portfolio records structured operator-observed adoption, revenue and task metrics with periods, samples and evidence. Commit-pinned authenticated GitHub report import now retains source identities. Direct Macaly site-wide traffic retrieval is now available separately. Product-specific analytics ingestion, independent checks and representative outcomes remain open."
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
    "detail": "Twenty versioned artifact-dom-v3 fixtures run in JSDOM and isolated Chromium with retained JSON reports. Broader capability, browser, integration, and experiment benchmarks remain open."
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
      <ol><li>Extend acceptance and integration benchmarks beyond the twenty controlled fixtures now checked in JSDOM and Chromium.</li><li>Collect representative Council-context relevance labels across varied missions, use the saved candidate comparisons, and repeat lesson-reuse outcome comparisons.</li><li>Extend source-specific analytics to other deployed products and collect representative repeated strategy/outcome comparisons.</li></ol><p><a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/FEATURE_FUNCTION_REVIEW.md" target="_blank" rel="noreferrer">Review page functions, components, and remaining capability gaps →</a></p>
      <p>Dependency and resource preflight checks block execution in the backend. Mission Control displays blockers, advisories, and resource availability; authorization and execution wait for ready preflight and incident clearance.</p>
    </div>
    <div className="glass-card research-card"><div className="panel-title"><span>IMPLEMENTED FOUNDATION</span><span className="live-pill">SAVED EVIDENCE</span></div>
      <ul><li>All 16 pages share ordered guidance, selected-mission state, honest progress states, and recovery links. Council continues to Research & Memory; partial planning is recorded with lower confidence.</li><li>Source audit repairs align runner delivery reads, repository/branch preflight, destination-specific preparation, shared sign-out recovery, intent parsing, metadata, and readiness wording. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/SOURCE_AUDIT.md" target="_blank" rel="noreferrer">Review the audit scope and retained differences →</a></li><li>Mission drafts retain owner-checked Manifest, Orchestrator, and reviewed-learning provenance. Verified Learning Engine now records applied-lesson comparisons against earlier baseline and subsequent mission measurements, preserving regressions as well as improvements. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/STRATEGY_REUSE_OUTCOMES.md" target="_blank" rel="noreferrer">Review reuse outcome evidence and limits →</a></li><li>Artifact Forge can explicitly publish an exact saved artifact/mission/test-plan snapshot to a dedicated CI branch, run isolated Chromium, and import digest/commit/attempt-bound GitHub Check evidence. Approval and delivery remain separate. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/EXACT_ARTIFACT_CI.md" target="_blank" rel="noreferrer">Review exact-snapshot CI workflow →</a></li><li>Capability & Reliability includes twenty repeatable DOM benchmark cases running in JSDOM and isolated Chromium, CI JSON reports, and operator-private receipts verified against GitHub job metadata. These fixture results do not certify generated artifacts. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/BENCHMARK_CI_EVIDENCE.md" target="_blank" rel="noreferrer">Review CI benchmark evidence and scope →</a></li><li>AI Council captures selected memory IDs, prompt channels and exact learning/preflight context for future planner attempts, with separate prepared/responded states and owner-labeled relevance scores. A separately captured lexical candidate can be compared using the same source window, unique-memory budget and saved labels; it never changes live planning. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/COUNCIL_MEMORY_SELECTION.md" target="_blank" rel="noreferrer">Review Council memory provenance and evaluation →</a></li><li>Research & Memory includes owner-scoped saved retrieval comparisons with precision, recall, reciprocal rank, observed lesson receipts and strategy traceability. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/MEMORY_RETRIEVAL_EVALUATION.md" target="_blank" rel="noreferrer">Review retrieval evaluation and limits →</a></li><li>Research & Memory now exposes saved context through private content search, selected-mission/all-owned scope, category filters, paginated records, and source/confidence receipts. Saved top-five retrieval comparisons now measure content search versus newest-five lessons with operator relevance labels. Representative corpus evaluation and strategy reuse outcomes remain open.</li><li>Artifact generation receives saved mission requirements and mission-specific research; delivery requires an explicitly selected approved artifact.</li><li>Artifact Forge supports fill/click/assertion plans, including explicit exact text equality, tied to saved acceptance criteria, isolated execution, per-step observed evidence, coverage, reusable plans, and exact mission/artifact snapshots. Reports remain client-reported and do not change approvals or delivery state. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/ARTIFACT_BROWSER_CHECKS.md" target="_blank" rel="noreferrer">Review browser check usage and limits →</a></li><li>Artifact re-verification preserves valid approval. Dispatch state cannot be rewound by approval, and matching callbacks are idempotent while conflicting receipts are rejected.</li><li>Mission Control includes adaptive learning guidance, saved runner status/errors, provider diagnostics, and documented escalation review. Review writes an audit receipt without automatically restarting execution.</li><li>Portfolio Intelligence retrieves site-wide NEXUS FORGE traffic directly from managed Macaly analytics, with explicit scope acknowledgement, exact response snapshots and private paginated receipts. A real deployed provider lookup was verified. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/DIRECT_SITE_ANALYTICS.md" target="_blank" rel="noreferrer">Review direct analytics scope and validation →</a></li><li>Portfolio Intelligence explicitly imports commit-pinned GitHub outcome reports with authenticated server lookup, bounded validation, immutable source receipts and digest/commit/path identities. Report figures remain repository-authored. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/GITHUB_PRODUCT_EVIDENCE_IMPORT.md" target="_blank" rel="noreferrer">Review import contract and evidence limits →</a></li><li>Portfolio Intelligence records structured product/business observations with sample sizes, completed periods, measurement methods, evidence and server-derived target comparisons. These stay separate from delivery readiness. <a href="https://github.com/eugenemcmillian3-tech/nexus-forge-/blob/main/docs/PRODUCT_OUTCOME_MEASUREMENTS.md" target="_blank" rel="noreferrer">Review product outcome evidence and limits →</a></li><li>Measured outcome recording and action-error recovery are available. Seven mission pages wait for evidence before showing missing-record guidance.</li><li>Readiness counts and HTTP callback types are validated; provider descriptions match routing policy.</li></ul>
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
