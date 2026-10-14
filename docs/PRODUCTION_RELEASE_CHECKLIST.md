# Production release checklist — 2026-10-14

**Decision: HOLD full production-readiness sign-off. The application is live.**

This is one finite release checklist for the current operator product. All 16 feature pages remain separate. The nine mission lifecycle checkpoints and the 24-milestone capability roadmap are different inventories. Multimodal, enterprise, external-agent and frontier-research expansions are outside this release scope.

## Evidence and exit criteria

| Gate | Audit result | Evidence / exact remaining exit |
| --- | --- | --- |
| Automated build/security checks | Recorded baseline | PR #137 / commit 69637006dc7ff1839665f78d4f6aa309768040bc: 379 GitHub tests, types, build and dual-engine fixtures passed. Current release PR must also remain green. |
| Public live runtime | Recorded | 32/32 route observations across all sixteen URLs at concurrency two; p95 98 ms at 21:26:02 UTC. Twenty Chromium shell checks passed across desktop and mobile. Anonymous mission access denied. Per-check reports are in docs/evidence. |
| Integrated workflow/recovery | Partial | Existing workflow, ownership, provider-failure, callback-replay, incident and recovery tests plus accepted Research/Manifest/LocalBoost evidence. Still record an integrated changed-stage and interrupted-run review; do not pretend public-shell probes are authenticated E2E. |
| Monitoring/alerts | Partial | Hourly bounded GitHub checks and retained reports implemented in production-release.yml. Confirm a successful main-branch execution and operator alert delivery. Current configuration alone does not establish notification delivery or continuous monitoring. |
| Backup/restore | BLOCKED | Private export, separate file backup, isolated Testing restore, row/ownership checks, retention, RPO/RTO and timed evidence required. Managed connector does not expose this browser-only operation. |
| Rollback | BLOCKED | Controlled Testing rehearsal, backward-compatible backend recovery, resulting publish and data-integrity evidence required. A written runbook is not a completed rehearsal. |
| Capacity/resource bounds | Partial | Small read-only burst completed. Define expected authenticated workload and run sustained Testing checks, including quota/budget behavior. |
| Cost attribution | Partial | Durable mission/stage invocations, explicit runner IDs, paginated usage history and pending/missing/gap visibility are implemented. Representative live ledger and billing reconciliation evidence remain open; no complete billing guarantee. |

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
- Operational procedures: PRODUCTION_OPERATIONS.md. Recordings of backup/restore, rollback, alert delivery and sustained workload are still required.

## Closure rule

A release decision must reference a source commit, matching CI evidence, the resulting READY publish, current live observations and completed operational evidence. Do not infer a pass from missing records or from a developer checking a box. Update the dated audit when new evidence exists; the page snapshot does not auto-follow GitHub or future deployments.

This batch closes the checklist-and-audit task. It does not claim that unavailable managed recovery drills or incomplete workload/accounting capabilities were performed.

## Accounting implementation update

The follow-up implementation closes code-side attribution and persistence-gap visibility for all current generative router paths. See [durable accounting](DURABLE_PROVIDER_ACCOUNTING.md). New controlled fault/concurrency and UI tests verify the ledger; they are not a sustained-capacity or live billing-reconciliation drill. Recovery UI was reached but Google account navigation was blocked by automatic approval review. Isolated recovery drills remain pending specific sign-in authorization.
