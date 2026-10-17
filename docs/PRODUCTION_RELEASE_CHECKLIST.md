# Production release checklist — 2026-10-14, updated 2026-10-15

## Held work resumed — 17 October 2026 UTC

Previously paused acceptance work is active again. A fresh private Live backup was saved and independently retrieved, daily capture resumed, actual test-payment receipts reconciled, concurrent funded inference and a real client disconnect passed, and 540 regressions passed. The isolated Testing overwrite was canceled after automatic approval review rejected it; specific approval for replacement-and-return remains necessary. See [current resumption results and exact dependencies](HELD_WORK_RESUMPTION_2026_10_17.md). Full readiness remains partial; business activation, actual provider invoices, representative workload targets and managed-host fault controls are not fabricated.


**Decision: HOLD full production-readiness sign-off. The application is live.** The operational-evidence batch of 2026-10-14/15 UTC recorded drill results for backup/restore, rollback, recovery, alert delivery, sustained workload and provider accounting in [docs/evidence/operational-evidence-20261015.md](evidence/operational-evidence-20261015.md); gates that depend on Managed Testing or provider billing remain open, so the HOLD stands.

This is one finite release checklist for the current operator product. All 16 feature pages remain separate. The nine mission lifecycle checkpoints and the 24-milestone capability roadmap are different inventories. Multimodal, enterprise, external-agent and frontier-research expansions are outside this release scope.

## Evidence and exit criteria

| Gate | Audit result | Evidence / exact remaining exit |
| --- | --- | --- |
| Automated build/security checks | Recorded baseline | PR #137 / commit 69637006dc7ff1839665f78d4f6aa309768040bc: 379 GitHub tests, types, build and dual-engine fixtures passed. Current release PR must also remain green. |
| Public live runtime | Recorded | 32/32 route observations across all sixteen URLs at concurrency two; p95 98 ms at 21:26:02 UTC. Twenty Chromium shell checks passed across desktop and mobile. Anonymous mission access denied. Per-check reports are in docs/evidence. |
| Integrated workflow/recovery | Partial | Existing workflow, ownership, provider-failure, callback-replay, incident and recovery tests plus accepted Research/Manifest/LocalBoost evidence. The 2026-10-14/15 recovery drill adds isolated interrupted-run evidence: bounded retries, hard-crash recovery in 17 seconds with the run safely parked for human review, no duplicate provider calls or dispatches (see docs/evidence/operational-evidence-20261015.md). An integrated changed-stage review is still outstanding. |
| Monitoring/alerts | Verified (bounded scope) | Production-monitor drill 38664996942 passed probes and failed at its deliberate drill step; normal run 38665052731 passed, including desktop/mobile hydration. Both reports retained. Operator confirmed receipt for drill 38664996942 at 2026-10-15 01:25 UTC (channel unspecified). GitHub scheduling is not continuous uptime coverage. |
| Backup/restore | Partial (demonstrated locally) | Live snapshot export (3 s, SHA-256 recorded) and isolated restore (2.8 s, 1,971 documents/34 tables) with record, ownership and delivery verification passed. Managed Testing restore remains unavailable; Convex file storage is empty so uploaded assets need a separate backup path; retention, RPO/RTO and end-to-end timed recovery remain open. |
| Rollback | Partial (rehearsed) | Isolated rehearsal completed 2026-10-14/15: pre-accounting code restore is not backward-compatible (ledger indexes deleted); compatible known version restored, verified and returned to current within ~2.5 minutes with data integrity confirmed. Live was never rolled back; the platform UI code restore and a Testing rehearsal remain pending operator sign-in/platform availability. |
| Capacity/resource bounds | Partial | Managed Testing cloud reads (2026-10-15): 60 s, 4 workers paced 500 ms each, 448 successful requests, 0 failures/throttling, p50 33 ms / p95 38 ms / max 143 ms; recovery probe 36 ms. Administrative owner impersonation across 5 paths. Follow-up paced write drill: 48 unique draft creates, 48 read-backs and matching creation audits over 61.7 s, 0 failures/throttling, write p95 180 ms, read p95 58 ms; Testing restored. No login, execution or provider inference load; agreed expected-workload certification remains open. |
| Cost attribution | Partial | Durable mission/stage invocations, explicit runner IDs, paginated usage history and pending/missing/gap visibility are implemented. A representative live ledger record is now verified (groq / openai/gpt-oss-20b, 2,216 tokens, mission/stage/owner attributed, usageStatus recorded). Billing reconciliation remains unknown: no provider billing access, so actual charges cannot be confirmed from token metadata. |

## What this batch completes

- Audits evidence already present instead of repeating accepted missions or authentication setup.
- Adds all-route public HTTP checks, explicit structured anonymous denial validation, bounded latency reporting and real desktop/mobile hydration checks.
- Adds a GitHub release-evidence workflow and hourly lightweight monitoring, with failed jobs visible and JSON reports retained for 14 days.
- Exposes the dated eight-gate checklist on the existing Capability & Reliability page; partial or blocked gates cannot become an automatic READY claim.
- Defines operational response, backup/restore, rollback and workload validation procedures in [the operations runbook](PRODUCTION_OPERATIONS.md).
- Keeps the full 16-page guide and existing approval/delivery behavior intact.

## Evidence map

- Guide and next-step behavior: __tests__/workspace-registry.test.ts, workflow-e2e.test.tsx, workflow-source-audit.test.tsx, mission-control-guidance.test.tsx.
- Recovery and invariants: delivery-callback-replay.test.ts, delivery-runtime-audit.test.ts, artifact-delivery-lifecycle.test.ts, incident-safety.test.ts, incident-review.test.ts, mission-control-recovery.test.tsx, ai-provider.test.ts.
- Ownership and private data: ownership-isolation.test.ts, orchestration-ownership.test.ts and feature-specific isolation cases.
- Generated artifact execution: artifact-behavior-benchmark.test.ts, artifact-browser-runner.test.ts, exact-artifact-ci.test.ts and the isolated exact-artifact GitHub workflow.
- Current release package: production-release.test.tsx plus the production release workflow reports.
- Operational procedures: PRODUCTION_OPERATIONS.md. Backup/restore, rollback, recovery, alert-drill and sustained-workload evidence recorded on 2026-10-14/15 UTC: docs/evidence/operational-evidence-20261015.md.

## Closure rule

A release decision must reference a source commit, matching CI evidence, the resulting READY publish, current live observations and completed operational evidence. Do not infer a pass from missing records or from a developer checking a box. Update the dated audit when new evidence exists; the page snapshot does not auto-follow GitHub or future deployments.

This batch closes the checklist-and-audit task. It does not claim that unavailable managed recovery drills or incomplete workload/accounting capabilities were performed.

## Accounting implementation update

The follow-up implementation closes code-side attribution and persistence-gap visibility for all current generative router paths. See [durable accounting](DURABLE_PROVIDER_ACCOUNTING.md). New controlled fault/concurrency and UI tests verify the ledger; they are not a sustained-capacity or live billing-reconciliation drill. Recovery UI was reached but Google account navigation was blocked by automatic approval review. Isolated recovery drills remain pending specific sign-in authorization.


### Managed rollback follow-up — 2026-10-15 UTC

Accounting-module rollback and return succeeded through managed Testing deploys, with compatible contracts, preserved checked records/ledger and exact source return (78.7-second data-verification window). See the operations runbook. The platform UI Version History reports 'No previous versions yet'; whole-version restore and Live/full-release recovery remain unverified. Keep rollback PARTIAL; operator sign-in is no longer the current blocker.


### Media backup follow-up — 2026-10-15 UTC

The one current design asset was downloaded through Macaly's supported Download control as a PNG matching the declared 1,191,209 bytes, retained privately, retrieved separately, byte/hash compared and rendered successfully. Both Production and Development App user uploads inventories were empty. See the operations runbook for the digest and scope. Durable database backup storage, recurring backup/retention policy, future upload coverage and agreed RPO/RTO remain open; backup stays PARTIAL.


### Retained database backup follow-up — 2026-10-15 UTC

Fresh Live snapshot (2,009 documents / 34 tables, 1,535,848 bytes) was saved privately, independently retrieved, byte/hash verified and restored through the supported Testing UI. All table counts matched; accepted mission and ledger checks passed; Testing returned to pre-drill state. The archive is not in GitHub. One-time database and media backup coverage is demonstrated; recurrence, retention, RPO/RTO and freshness monitoring remain open. Backup stays PARTIAL.
