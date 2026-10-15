# Production operations runbook

Audit date: 2026-10-14, operational evidence batch 2026-10-14/15 UTC. Scope: the current NEXUS FORGE operator product, with 16 feature pages and a separate nine-checkpoint mission lifecycle. The procedures below are now backed by the recorded drill evidence in [docs/evidence/operational-evidence-20261015.md](evidence/operational-evidence-20261015.md).

## Monitoring

The production-release.yml GitHub workflow checks four public routes plus anonymous mission denial hourly, at minute 17 UTC. Pull requests, main pushes and manual runs check all sixteen routes twice with concurrency two, plus sixteen desktop/four mobile Chromium shell checks. No credentials, verification emails, provider inference or mission execution are used.

Each request has a 15-second timeout, same-origin redirect limits and a 512 KiB HTML cap. Full probes require a p95 at or below 5 seconds; this is a small public-shell probe budget, not a sustained-load SLA. The Live Convex target is explicit release-workflow configuration and never replaces the managed application connection. Network/schema/generic server errors cannot satisfy the anonymous denial check.

Failed jobs appear in GitHub Actions. Alert delivery depends on the operator's GitHub Actions notification settings. A deliberate failure drill was dispatched on 2026-10-15T00:10:18Z (run 38658472244, read-only artifact-checks workflow with a nonexistent snapshot input, no production side effects); the operator confirmed receipt on 2026-10-15 00:26 UTC (channel unspecified). Receipt is verified for that artifact-checks drill. Production-release drill 38664996942 passed probes and failed at its intended drill step; normal run 38665052731 passed including browser checks. The operator confirmed drill notification receipt on 2026-10-15 01:25 UTC (channel unspecified). The bounded monitoring gate is verified. GitHub schedules may be delayed or disabled; the monitor is not continuous uptime coverage. Reports are retained as Actions artifacts for 14 days. Scheduled runs are deliberately lightweight and skip browser installation.

When a probe fails: inspect its bounded report, check Macaly deployment status and logs, distinguish public-shell/backend reachability from authenticated workflow behavior, then follow the existing Incident Center. Do not restart inference or replay delivery simply to clear a monitor.

## Backup and restore

**Status: snapshot export and isolated restore demonstrated; Managed Testing restore, uploaded-asset coverage and RPO/RTO remain open.**

Recorded evidence (2026-10-14/15 UTC, see [operational evidence](evidence/operational-evidence-20261015.md)): Live snapshot export in 3 seconds (1,532,578 bytes, SHA-256 b111058d…92ae3e) with 1,971 documents across 34 tables and 0 Convex files; isolated restore into a fresh local backend in 2.8 seconds with record, ownership and delivery/workflow verification passing. Limitations: the restore target was an isolated local Convex backend because Managed Testing selection was unavailable; uploaded assets outside Convex need a separate backup path; retention, RPO and RTO are not yet agreed.

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

**Status: isolated rehearsal completed; Live rollback not performed; platform UI restore still pending operator sign-in.**

Recorded evidence (2026-10-14/15 UTC, see [operational evidence](evidence/operational-evidence-20261015.md)): restoring pre-accounting backend code (local commit 7102089, the state before the provider-accounting batch) onto a database with ledger rows deleted the providerInvocations indexes immediately — code rollback across the accounting boundary is not backward-compatible with ledger data. A compatible known version (150241c) was then restored, verified against restored data, and the current code returned and re-verified within about 2.5 minutes. Live was never rolled back. A code restore does not restore Live Convex code, tables or uploaded files.

Historical baseline 69637006dc7ff1839665f78d4f6aa309768040bc (PR #137) predates durable provider accounting: do not use it as a compatible rollback target for the current ledger schema. Candidate current-generation source reference: 9332a773b597ed5c54e4faa7ac4f21818ba87e96 (PR #140), with passing CI and subsequent drill/normal monitor runs. It retains accounting contracts, but its platform UI restore still requires a Testing rehearsal before being approved as a rollback target. Capture the exact current Macaly version and backend identity separately; a GitHub commit alone is not a recoverable platform version. Keep the platform repository separate from the dispatch target nexus-forge1/no-dispatch.

Platform code restore documentation:
https://www.macaly.com/docs/en/agent/modes#can-i-restore-a-previous-version-of-my-project

1. Preserve current release identity, database state and incident evidence.
2. Rehearse the intended previous code version in isolated Testing. Review backward compatibility against the target backend; a code restore does not roll back Live Convex code, tables or uploaded files.
3. Run strict validation, regression tests and the managed Convex compatibility check for any backend recovery. Do not remove published contracts to force a rollback.
4. Publish recovery only after the selected version and backend are compatible. Recheck the resulting deployment READY state, live routes, selected-mission behavior and existing records.
5. Record resulting commit/deployment, elapsed recovery, invariant checks and remaining incidents. Return to the current version after a rehearsal as appropriate.

The live production service was not deliberately rolled back or disrupted to manufacture a drill result.

## Capacity and cost

**Status: sustained authenticated workload demonstrated on the isolated backend; Testing/cloud capacity remains open.** Recorded evidence (2026-10-15): 90 seconds at concurrency 4 under an authenticated operator identity produced 270,213 owner-scoped requests across five representative read paths with 0 failures and 0 throttling; p50 1 ms, p95 2–3 ms, max 54 ms, recovery probe 5 ms. Limits: local backend seeded with restored Live-scale data, representative authenticated reads only, no sustained provider inference. Define expected concurrent operators, mission frequency and acceptable latency/error/cost limits, then repeat in Testing before certifying an expected production workload.

Supported stages retain provider-reported usage, with unknown charges kept unknown and no inference replay after a usage-save failure. Explicit runner attribution and accounting-gap visibility are implemented and have scoped evidence; provider billing reconciliation and broader workload validation remain open. Do not infer zero cost, complete billing, or a hard spend guarantee from incomplete metadata.

## Release decision

Use PRODUCTION_RELEASE_CHECKLIST.md and the checklist on Capability & Reliability. Partial/blocked evidence holds full production sign-off. Existing accepted Research, Manifest and LocalBoost receipts remain valid evidence for their recorded scope. Authentication and approval are not repeated as setup exercises.

## Production monitor notification drill

Run `production-release.yml` manually on `main` with boolean input `alert_drill: true`. The default is false. This uses the hourly monitor probe mode, skips browser installation, and deliberately fails only after the live read-only probes pass. It does not modify production data or deploy code. Its separate concurrency group cannot cancel normal monitoring.

CLI equivalent: `gh workflow run production-release.yml --repo eugenemcmillian3-tech/nexus-forge- --ref main -f alert_drill=true`.

Verify the run fails at `Deliberate monitoring alert drill`, its public probes passed, and `production-release-observations` was retained. If it fails earlier, investigate the real failure; that is not a completed synthetic drill. Record the run URL, commit, timestamp and operator-confirmed notification receipt before closing the monitoring gate. The earlier confirmed artifact-checks notification does not by itself verify this workflow. A later normal run must pass; never change the drill input default or hourly schedule to force failures.

## External asset inventory and recovery preparation — 2026-10-15 UTC

Connector inventory returned one media asset and no further page: asset ID `vbulbicriictpw7c3hic4a01`, filename `generated-nexus-forge-banner-htW.png`, declared content type `image/png`, declared size 1,191,209 bytes, created 2026-10-10T04:38:46.659Z. This is inventory metadata, not a backup receipt. The connector URL is an optimized CDN image transformation; its downloaded bytes must not be claimed to match the original PNG or declared original size.

Before closing asset recovery: obtain the original through a supported Macaly export/download path, store it in approved private backup storage, record its actual byte count and SHA-256, restore it to an isolated destination and verify the restored bytes and rendered asset. If only a transformed derivative is available, label it as a derivative and keep original-file recovery open. Do not copy media into source/public or commit production snapshots to GitHub.

Managed Testing creation/selection is not exposed by the current connector or its database/environment guide catalog. Both sandbox and published project currently report Live / tame-rat-826. Do not treat the preview frontend as database isolation. The remaining prerequisite is a platform-created Testing deployment with a different identity, selected through the supported Macaly controls. Verify both identities before any import or recovery experiment.

Recovery policy decisions remain unapproved: private storage destination, backup frequency, retention, maximum acceptable data loss (RPO) and full service recovery time (RTO). Drill durations already recorded are observations, not agreed objectives. Record these decisions and an actual private backup/restore receipt before marking backup coverage complete.
