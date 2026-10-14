# Current feature/function/component review — 2026-10-14

Scope: the 16 existing product pages, their exposed controls, shared guide, and backing modules. This is a source/interface inventory with targeted regression checks, not a new live end-to-end acceptance run or a declaration that all 24 roadmap milestones are complete.

The nine mission lifecycle checkpoints remain separate from the 16-page product guide. No additional workspace was created.

| Page | Exposed functions and primary components | Implemented boundary / remaining capability work |
| --- | --- | --- |
| Overview (`/`) | Selected-mission overview, ordered page inventory, shared next-action guidance | Uses persisted evidence states; does not certify business outcomes. |
| Guided Workflow (`/workflow`) | Lifecycle guide, MissionControl, bounded runner start, recovery, delivery measurement | Execution/approval gates and saved measurements exist; broader runtime and long-horizon reliability remain partial. |
| Roadmap (`/roadmap`) | 24 milestones, completed/partial/deferred groups, next priority | Product build status is separate from mission completion. |
| Manifest (`/manifest`) | Blueprint/strategy records, evidence/outcome signals, mission source handoff | Accepted receipt is retained; automatic real-world outcome ingestion and broader world context remain incomplete. |
| Orchestrator (`/orchestrator`) | Intent compiler, competing strategies, saved specification, governed draft creation | Validated contract and owner-checked provenance exist; measured task-aware strategy/model selection remains partial. |
| Mission Console (`/mission`) | Contract creation, source handoff, selection/history, explicit mission approval | Creates selected persisted drafts; does not start execution. |
| AI Providers (`/providers`) | Manual inference diagnostics, stored history, routing policy visibility | Point-in-time health only. Mistral/Hugging Face remain deferred; OpenRouter is manual-only. |
| AI Council (`/council`) | Agent orchestration/runs, partial-result warning, saved summary, Research continuation | Partial memories have lower confidence; broader independent planning-quality evaluation remains open. |
| Research & Memory (`/evidence`) | Cited research, saved source inspection, new MemoryBrowser | Previously the memory panel was descriptive only. It now provides owner-scoped content search, mission/category filters, paginated browsing, source/confidence/receipt details, and full record inspection. Retrieval relevance and reuse-effectiveness benchmarks remain open. |
| Artifact Forge (`/artifacts`) | Generate from saved mission/research, inspect content, structural verification, approval | Structural gates plus configurable criterion-linked browser interaction checks exist. Reports retain exact snapshots and per-step evidence; exact saved-snapshot Chromium CI and GitHub Check import now exist; broader integrated behavior remains open. |
| Delivery (`/delivery`) | Exact artifact choice, destination preparation/correction, approval, explicit dispatch, workflow/deployment/readiness receipts | Repository/branch preflight and immutable callback evidence exist. New product/business outcome measurement is separate. |
| Launch Readiness (`/readiness`) | URL checks, pass/fail evidence, audit history, canonical delivery evidence | Readiness proves the recorded checks, not complete artifact functionality or user value. |
| Portfolio (`/portfolio`) | Recommendations, decisions, accept-to-draft continuation, measured summaries | Recommendations are advisory; larger evidence coverage and actual product outcome ingestion remain partial. |
| Learning (`/learning`) | Measured comparisons, safety evidence, reviewed lesson capture, draft handoff | Operator-entered comparisons remain distinguished from independent verification; broader benchmark coverage is needed. |
| Capability & Reliability (`/capabilities`) | Recorded mission, verification, incident, experiment, and manual provider signals | Dashboard includes artifact-dom-v2 controlled fixtures and operator-private GitHub-verified CI receipts. It remains an aggregate view, not an uptime monitor or a complete capability benchmark suite. |
| Incident Center (`/incidents`) | Saved incidents, owner-scoped diagnosis, documented escalation review, recovery evidence | Review never resumes execution automatically; broader failure-mode/recovery validation remains partial. |

## This change

- Add `src/components/memory-browser.tsx` to the existing Research & Memory page.
- Add `memory.browse` with operator-derived ownership, mission access checks, optional category filtering, bounded search input, and pagination.
- Add the `memories.search_value` full-text index on content, filtered by owner, mission, and category.
- Default to selected-mission memory; all owned records, including unlinked records, remain available through the scope control.
- Show the saved source, confidence, creation time, mission association, and receipt. Confidence is advisory metadata.
- Search uses content words and relevance ordering; browsing is newest first. Loaded counts are explicitly not total-history counts.
- Seven backend and four UI tests cover ownership, search boundaries, pagination, loading/empty states, filtering, and provenance.

## Next build priority

Criterion-linked browser interaction checks are now available on Artifact Forge; see [usage and evidence boundaries](ARTIFACT_BROWSER_CHECKS.md). The versioned DOM fixture suite and GitHub-verified CI receipts now exist; see [CI benchmark scope](BENCHMARK_CI_EVIDENCE.md). Exact artifact-snapshot Chromium CI is now available; see [workflow and limits](EXACT_ARTIFACT_CI.md). Next broaden criterion and integration coverage. Keep the existing accepted Research, Manifest, and LocalBoost evidence; do not repeat authentication or approval exercises as a routine maintenance gate.

The remaining 16 partial milestones and seven deferred expansions stay partial/deferred. Search availability alone does not complete the persistent-knowledge milestone; semantic relevance, ranking evaluation, and measured reuse effectiveness remain open.
