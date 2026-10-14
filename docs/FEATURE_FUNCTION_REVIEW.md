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
| Portfolio (`/portfolio`) | Recommendations, decisions, accept-to-draft continuation, structured product outcome observations | Recommendations are advisory. Operator-recorded adoption/revenue/task observations now retain periods, samples and evidence; authenticated GitHub report imports now retain exact source receipts. Direct analytics ingestion, independent verification and representative outcomes remain partial. |
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

## Lesson retrieval evaluation update

Research & Memory now includes saved server-observed top-five content-search versus newest-five lesson comparisons. Operator-selected expected IDs provide relevance labels; receipts retain scope, rankings, precision/recall/reciprocal rank and reviewed-lesson strategy links. See [operating details and limits](MEMORY_RETRIEVAL_EVALUATION.md). Actual Council context retrieval and strategy reuse outcome effectiveness remain partial. All 16 feature pages remain in the guide.

## Reviewed lesson reuse update

Verified Learning Engine now records reviewed lesson + Manifest strategy + mission-source provenance against an earlier baseline and subsequent reuse-mission measurement. Runtime cost and delivery readiness comparisons preserve snapshots, signed change, regressions and explicit application/comparability attestation. See [reuse comparison details](STRATEGY_REUSE_OUTCOMES.md). This implements the observation link, not causal effectiveness or business-outcome validation; learning/outcome milestones remain partial.

## Structured product observations update

Portfolio Intelligence now records five bounded product/business metric types in private paginated mission-linked history, separate from readiness verification. Backend-derived task rates, units, directions and reported target comparisons retain operator provenance. See [operating details](PRODUCT_OUTCOME_MEASUREMENTS.md). Product observations now integrate with strategy reuse through matched period/sample/method comparisons. Authenticated analytics ingestion and independent outcome verification remain next work. No new workspace or automatic completion is added.

## Product reuse comparison update

Verified Learning Engine now selects either cost/readiness measurements or structured product observations for reviewed-lesson reuse. Product comparisons enforce matched metric/unit/direction/target, sample size, elapsed observation duration and saved method text, plus periods on the correct sides of the source handoff. Snapshots and rates are computed from server-read records; application/comparability remain operator attestations. See [comparison rules and scope](STRATEGY_REUSE_OUTCOMES.md). No new workspace, auto-promotion or causal claim is added.

## Authenticated repository-report ingestion update

Portfolio Intelligence imports product-outcome-v1 JSON reports from the fixed project repository at full commit SHAs. Server-side owned-mission authorization, bounded byte/identity validation, source digests and immutable idempotent receipts distinguish github-report from manual operator-recorded observations. Product reuse snapshots retain that provenance. See [import workflow and limits](GITHUB_PRODUCT_EVIDENCE_IMPORT.md). Repository source verification does not independently certify report figures; direct analytics ingestion remains open.

## Direct managed analytics update

Portfolio Intelligence now retrieves aggregate NEXUS FORGE site traffic from the existing Macaly managed connection and saves owner-private, scope-acknowledged receipts with raw response and SHA-256 identity. The deployed backend was verified against the real provider. See [direct analytics scope and evidence](DIRECT_SITE_ANALYTICS.md). Traffic stays separate from mission-attributed product outcomes; integrations for other deployed products and independent outcome validation remain partial.

## Council memory-context evidence update

AI Council now captures prospective selected memory IDs, channel routing, exact rendered learning/preflight text and saved mission input. Receipts distinguish prepared from a returned planner response; relevance evaluations use owned historical labels without rerunning models. Existing recent-history policy remains unchanged. See [context/evaluation contract](COUNCIL_MEMORY_SELECTION.md). Historical runs are not backfilled, and model attention or causal effectiveness is not claimed. Advisory lexical candidate comparisons now reuse the same captured source window, selection budget and saved relevance labels. See [comparison workflow](COUNCIL_MEMORY_POLICY_COMPARISON.md). Representative cross-mission labels and repeated outcome validation remain next work.
