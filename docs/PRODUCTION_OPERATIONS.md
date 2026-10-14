# Production operations runbook

Audit date: 2026-10-14. Scope: the current NEXUS FORGE operator product, with 16 feature pages and a separate nine-checkpoint mission lifecycle. This runbook is a procedure, not evidence that a recovery drill succeeded.

## Monitoring

The production-release.yml GitHub workflow checks four public routes plus anonymous mission denial hourly, at minute 17 UTC. Pull requests, main pushes and manual runs check all sixteen routes twice with concurrency two, plus sixteen desktop/four mobile Chromium shell checks. No credentials, verification emails, provider inference or mission execution are used.

Each request has a 15-second timeout, same-origin redirect limits and a 512 KiB HTML cap. Full probes require a p95 at or below 5 seconds; this is a small public-shell probe budget, not a sustained-load SLA. The Live Convex target is explicit release-workflow configuration and never replaces the managed application connection. Network/schema/generic server errors cannot satisfy the anonymous denial check.

Failed jobs appear in GitHub Actions. Alert delivery depends on the operator's GitHub Actions notification settings and has not been tested. Verify notification delivery before calling alerting operational. GitHub schedules may be delayed or disabled; the monitor is not continuous uptime coverage. Reports are retained as Actions artifacts for 14 days. Scheduled runs are deliberately lightweight and skip browser installation.

When a probe fails: inspect its bounded report, check Macaly deployment status and logs, distinguish public-shell/backend reachability from authenticated workflow behavior, then follow the existing Incident Center. Do not restart inference or replay delivery simply to clear a monitor.

## Backup and restore

**Status: blocked pending an isolated recovery drill and retention evidence.**

The managed platform documentation describes Database Export/Import:
https://www.macaly.com/docs/en/features/databases#downloading-and-restoring

1. Identify the Live deployment and capture its release commit and observation time.
2. Use Export in the Live Database UI to create a private table snapshot. Keep it in approved private backup storage, with its SHA-256 digest and retention policy. Never commit production table snapshots to GitHub.
3. Inventory uploaded files separately: table snapshots do not include them.
4. Create or select an isolated Testing database in Macaly. Verify its deployment identity differs from Live before importing.
5. Import the snapshot into Testing only. Import replaces the selected database; export its current state first if needed. Verify expected table/row counts and ownership boundaries, plus restoration of separately backed-up files.
6. Record export time, restore target, snapshot digest, restored counts, functional checks, elapsed recovery, retention and agreed RPO/RTO. A backup existing without a successful restore is insufficient.

No exposed connector capability performed this browser-only export/import drill. No Live tables were replaced, exported into source or restored as part of this audit.

## Rollback

**Status: blocked pending a controlled rehearsal.**

Known-good baseline: platform repository commit 69637006dc7ff1839665f78d4f6aa309768040bc (PR #137), with its recorded CI and Macaly publish. Keep the repository separate from the dispatch target nexus-forge1/no-dispatch.

Platform code restore documentation:
https://www.macaly.com/docs/en/agent/modes#can-i-restore-a-previous-version-of-my-project

1. Preserve current release identity, database state and incident evidence.
2. Rehearse the intended previous code version in isolated Testing. Review backward compatibility against the target backend; a code restore does not roll back Live Convex code, tables or uploaded files.
3. Run strict validation, regression tests and the managed Convex compatibility check for any backend recovery. Do not remove published contracts to force a rollback.
4. Publish recovery only after the selected version and backend are compatible. Recheck the resulting deployment READY state, live routes, selected-mission behavior and existing records.
5. Record resulting commit/deployment, elapsed recovery, invariant checks and remaining incidents. Return to the current version after a rehearsal as appropriate.

The live production service was not deliberately rolled back or disrupted to manufacture a drill result.

## Capacity and cost

**Status: partial.** The completed burst is 32 public read-only requests at concurrency two, not authenticated sustained capacity. Define expected concurrent operators, mission frequency, representative provider workload, storage growth, and acceptable latency/error/cost limits. Exercise these in Testing, including interrupted-run recovery, quotas and budget behavior, before certifying an expected production workload.

Supported stages retain provider-reported usage, with unknown charges kept unknown and no inference replay after a usage-save failure. Complete per-run attribution, accounting-gap visibility and billing reconciliation remain open. Do not infer zero cost, complete billing, or a hard spend guarantee from incomplete metadata.

## Release decision

Use PRODUCTION_RELEASE_CHECKLIST.md and the checklist on Capability & Reliability. Partial/blocked evidence holds full production sign-off. Existing accepted Research, Manifest and LocalBoost receipts remain valid evidence for their recorded scope. Authentication and approval are not repeated as setup exercises.
