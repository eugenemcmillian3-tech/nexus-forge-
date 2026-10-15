# Production operations runbook

Audit date: 2026-10-14, operational evidence batch 2026-10-14/15 UTC. Scope: the current NEXUS FORGE operator product, with 16 feature pages and a separate nine-checkpoint mission lifecycle. The procedures below are now backed by the recorded drill evidence in [docs/evidence/operational-evidence-20261015.md](evidence/operational-evidence-20261015.md).

## Monitoring

The production-release.yml GitHub workflow checks four public routes plus anonymous mission denial hourly, at minute 17 UTC. Pull requests, main pushes and manual runs check all sixteen routes twice with concurrency two, plus sixteen desktop/four mobile Chromium shell checks. No credentials, verification emails, provider inference or mission execution are used.

Each request has a 15-second timeout, same-origin redirect limits and a 512 KiB HTML cap. Full probes require a p95 at or below 5 seconds; this is a small public-shell probe budget, not a sustained-load SLA. The Live Convex target is explicit release-workflow configuration and never replaces the managed application connection. Network/schema/generic server errors cannot satisfy the anonymous denial check.

Failed jobs appear in GitHub Actions. Alert delivery depends on the operator's GitHub Actions notification settings. A deliberate failure drill was dispatched on 2026-10-15T00:10:18Z (run 38658472244, read-only artifact-checks workflow with a nonexistent snapshot input, no production side effects); the operator confirmed receipt on 2026-10-15 00:26 UTC (channel unspecified). Receipt is verified for that artifact-checks drill. Production-release drill 38664996942 passed probes and failed at its intended drill step; normal run 38665052731 passed including browser checks. The operator confirmed drill notification receipt on 2026-10-15 01:25 UTC (channel unspecified). The bounded monitoring gate is verified. GitHub schedules may be delayed or disabled; the monitor is not continuous uptime coverage. Reports are retained as Actions artifacts for 14 days. Scheduled runs are deliberately lightweight and skip browser installation.

When a probe fails: inspect its bounded report, check Macaly deployment status and logs, distinguish public-shell/backend reachability from authenticated workflow behavior, then follow the existing Incident Center. Do not restart inference or replay delivery simply to clear a monitor.

## Backup and restore

**Status: snapshot export, isolated local restore and Managed Testing table restore demonstrated; uploaded-asset coverage, durable retention and RPO/RTO remain open.**

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

**Status: isolated and managed Testing module rehearsals completed; Live rollback not performed; platform UI restore blocked by an empty Version History panel.**

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

Managed Testing creation/selection is not exposed by the connector, but the authorized browser fallback completed it on 2026-10-15 UTC using Database → Add testing mode. Verified platform identities: sandbox Testing / quick-rabbit-810; publish Live / tame-rat-826. Managed Testing snapshot restore now has evidence below. Continue to verify both identities before every import or recovery experiment; preview alone is not proof of isolation.
## Managed Testing restore evidence — 2026-10-15 UTC

- Created and selected Testing through the supported Macaly UI. get_project independently confirmed Testing quick-rabbit-810 and Live tame-rat-826; production remained READY.
- Saved a pre-drill Testing snapshot with file-storage inclusion (2,113 ms), then imported the previously recorded Live snapshot only into identity-guarded Testing (10,163 ms). Snapshot SHA-256: b111058d56bbed44716c2b16d50a33aa4e834318f022d7f6601f17bdf492ae3e.
- Verified exact counts across all 34 user/auth tables: 1,971 documents, zero count mismatches. Accepted LocalBoost mission k97511n9ds6vq0g5vkym5p2pjd8g756v remained approved/complete; owner query succeeded; related records: 2 research, 2 artifacts, 1 delivery.
- Foreign-user query returned a generic Server Error at the CLI. Subsequent Testing deployment logs independently showed `Uncaught ConvexError: Mission not found or access denied` from requireOwnedMission for both probes (01:54:51Z and 01:55:08Z). Managed ownership denial is therefore confirmed by backend evidence.
- Restored the pre-drill Testing snapshot (9,796 ms); verified 51 missions, 29 research rows and 1 provider invocation. The older snapshot had 28 research rows and no provider invocations, as expected from its earlier capture time.
- No provider execution, external dispatch, production import, or code rollback was invoked. Temporary sandbox ZIPs are drill materials, not durable private backup storage.
- Managed table restore is demonstrated. External original-asset recovery, durable backup retention, agreed RPO/RTO, managed code rollback, controlled cloud recovery, cloud load and provider billing reconciliation remain open. Full release HOLD remains.


Recovery policy decisions remain unapproved: private storage destination, backup frequency, retention, maximum acceptable data loss (RPO) and full service recovery time (RTO). Drill durations already recorded are observations, not agreed objectives. Record these decisions and an actual private backup/restore receipt before marking backup coverage complete.


## Managed Testing persisted-state recovery — 2026-10-15T02:13:25Z

Scope: bounded persisted-state interruption and sequential tick replay on Testing quick-rabbit-810. This is not evidence of a managed-host crash, concurrent workers, or interruption during successful provider inference. Live tame-rat-826 was not modified.

- Exported a pre-drill Testing snapshot with file storage before state changes.
- Selected completed mission k97ffpysbj8p230v72yw9rh3m98fnchc, run m179896f39pgrakmdaszvt8e0n8fm1jq. Its historical runner was blocked at timeout_escalation. Using the existing internal state mutation in Testing only, set the runner to paused / agent_coordination to simulate a stale persisted runner after mission completion; kept the mission approved/complete and its expired deadline unchanged.
- Invoked the existing runner tick twice sequentially. The first reconciled the stale runner to complete / complete despite its expired deadline; the second was a no-op for provider/delivery/incident effects. Retries remained zero.
- A second restored draft mission k971tsrea7x25je0wrgkps90xd8fmv6h, run m172tpx5v47pm8fczbcddv8rhn8fnzkm, safely parked at paused / awaiting_mission_approval on both ticks. No new authentication or approval setup was performed.
- Whole-Testing counts before and after replay: providerInvocations 1 → 1, deliveries 20 → 20, incidents 5 → 5. No new provider execution, delivery row, or incident was created. The batch including safety export and verification took 12,431 ms; this is not a service RTO.
- Returned Testing to its pre-drill snapshot and verified the historical runner returned to blocked, with the same ledger/delivery/incident counts. Snapshot files are temporary drill materials, not durable backups.
- PASS for completed-outcome reconciliation and sequential replay side-effect invariants. Broader recovery gate remains PARTIAL: successful-provider interruption, concurrent replay, and managed-host failure/recovery are not demonstrated. Managed rollback, cloud workload, asset backup and billing evidence remain open; full release HOLD remains.


## Managed Testing concurrent reconciliation — 2026-10-15T02:28:56Z

- Target: Testing quick-rabbit-810, mission k97ffpysbj8p230v72yw9rh3m98fnchc and runner m179896f39pgrakmdaszvt8e0n8fm1jq. Production remained on tame-rat-826.
- Exported a safety snapshot, then used the existing internal state mutation to simulate a stale paused / agent_coordination runner for the already-complete mission. Issued four concurrent CLI tick requests; all four succeeded (client durations 2,286–2,515 ms; batch including final query 3,887 ms). These are overlapping client requests, not traced proof that every backend handler overlapped at each stage.
- Runner reconciled to complete / complete, retries 0. Whole-Testing counts stayed providerInvocations 1, deliveries 20, incidents 5: zero new rows in all three categories.
- Restored the pre-drill snapshot and verified original blocked / timeout_escalation runner state and unchanged counts.
- PASS for four-client concurrent completed-outcome reconciliation. No active provider call, artifact generation, or delivery execution was exercised. This does not establish exactly-once execution or active-work concurrency safety. Source review shows multi-step runner/Council actions that require an active-work claim/idempotency review before a concurrent inference drill; do not mark the wider recovery gate complete from this result.
- Next engineering priority: review atomic claiming/fencing of active work and its provider-call recovery boundary, then verify with bounded Testing evidence. Managed-host interruption, managed rollback, sustained cloud capacity, original-asset backup and billing reconciliation remain open. Release HOLD remains.


## Active provider reservation exclusion — 2026-10-15T02:34:48Z

- Fixed providerUsage.begin to atomically check for an existing pending invocation with the same mission, runner, stage and role before inserting. The indexed read and insertion occur in one Convex mutation transaction. Calls without a runner retain independent invocation semantics; distinct stages remain independent.
- Pending reservations never expire automatically, including after runner retry-count changes. A crash after provider execution but before finalization remains pending for review rather than triggering another inference request. A completed invocation permits a later explicit invocation; this is pending-call mutual exclusion, not exactly-once delivery or durable answer replay. Provider fallbacks within one invocation are unchanged.
- Added controlled-provider tests: block a second call while the first fetch is held open; permit a later call after completion; block replay after interrupted finalization even when runner retries increases. All 8 provider-accounting tests and all 371 tests across 63 files passed; strict TypeScript validation passed.
- Managed Testing deployment succeeded with a backward-compatible public contract. On quick-rabbit-810, four concurrent providerUsage.begin requests produced exactly one pending row (p97ac91sr28r5mr0r93xgazw1d8ga4jc), one winner and three rejected contenders. Batch 3,761 ms; no provider network requests were made by this reservation drill. Testing snapshot restored afterward.
- Scope: managed transactional reservation evidence plus mocked held-open inference/finalization fault tests. No live provider cancellation or managed-host crash was induced. Wider recovery gate and full release HOLD remain; do not claim exactly-once active workflow execution from this guard alone.


## Operator visibility for unresolved provider work — 2026-10-15 UTC

The existing Providers ledger now displays mission and role attribution and a per-record explanation for pending work. Runner-linked pending invocations explain that the runner/stage/role reservation blocks overlapping inference; direct invocations explicitly have no runner reservation. Both explain that pending does not prove failure, and that the provider response and mission state must be checked before retrying. No reset, inferred finalization, reservation expiry, or replay action was added. Ledger rendering tests (3) and strict validation passed. This improves recovery visibility without closing provider-interruption or exactly-once recovery evidence gaps.


## Managed Testing cloud read workload — 2026-10-15T02:44:33Z

- Deployment quick-rabbit-810, distinct from Live tame-rat-826. Four workers for 60,070 ms, each paced 500 ms after requests; five owner-scoped paths: mission ledger, owner ledger, mission list, portfolio decision snapshot, runner state.
- 448 requests, 448 succeeded, 0 failures, 0 observed throttling. Overall p50 33 ms, p95 38 ms, max 143 ms. Post-load portfolio recovery probe 36 ms. Per-path p95: mission ledger 42 ms, owner ledger 38 ms, mission list 53 ms, portfolio 39 ms, runner state 35 ms.
- Identity: managed administrative impersonation of an existing owner. This exercises owner-scoped reads, not sign-in/session-validation throughput. No inference, writes or delivery execution were invoked. Before/after counts unchanged: missions 51, deliveries 20, providerInvocations 1.
- PASS for the observed bounded workload only. No expected production traffic profile, agreed SLA, saturation capacity, write/provider workload, budget/rate-limit boundary or storage-capacity certification was established. The capacity gate remains PARTIAL. Follow-up replaces the previous local-only limitation, not all capacity exit criteria.


## Managed Testing paced draft writes — 2026-10-15T02:52:31Z

- Identity-guarded Testing quick-rabbit-810; managed administrative owner impersonation, not session-authentication throughput. Four workers, 12 iterations each, 5-second pacing, elapsed 61,660 ms.
- 48 mission creates and 48 owner read-backs, zero failures/throttling; 48 unique IDs, all draft/unapproved with budget 0. Exactly 48 matching mission:mission_created audit records verified by mission ID. Write p50 69 ms / p95 180 ms / max 218 ms; read-back p50 40 ms / p95 58 ms / max 80 ms.
- Before/after workload: missions 51 → 99, auditEvents 334 → 382, providerInvocations 1 → 1, deliveries 20 → 20. No inference or mission execution was requested. Restored the pre-drill Testing snapshot afterward; verified original counts returned.
- The initial harness checked the mutation argument name action instead of persisted eventType, so its audit relationship assertion was invalid. After inspecting audit.ts, corrected the assertion to eventType=mission:mission_created and repeated the bounded drill; the metrics above are from the corrected run. No product audit defect was found.
- PASS for this paced draft-write/read-back/audit workload. Provider inference, concurrent mission execution, billing and budget enforcement under inference, saturation, multi-owner/session load, agreed workload targets and storage capacity remain outside scope. Capacity remains PARTIAL; the read-only limitation is now narrowed to missing execution/inference and scale evidence.


## Managed Testing accounting-module rollback — 2026-10-15T02:58:36Z

- Platform UI inspected after authenticated sign-in: Version History reported 'No previous versions yet'. No UI restore was performed. This is a different blocker from the earlier sign-in restriction.
- Starting Macaly source HEAD 4bc3e1c529f7010787475bfeab2fba67da83222b. Replaced only convex/providerUsage.ts with its exact content from local commit 150241c59a435dca5ebfbb7a2f026fe667b7ae13; git diff against that historical module was empty. Other source files and schema were not rolled back. This is not a whole-release rollback.
- Exported Testing safety snapshot; verified target quick-rabbit-810. Managed deploy command accepted the historical candidate as public-contract backward-compatible and deployed to Testing. The historical module lacks the current active-call reservation guard, so no provider/inference work was exercised during the rehearsal.
- Historical verification: unchanged counts for missions 51, research 29, artifacts 45, deliveries 20, missionRuns 15, auditEvents 334, providerInvocations 1; accepted mission approved/complete; indexed mission ledger retained its succeeded/recorded row and one report; owner-scoped ledger query returned it.
- Restored exact current module bytes and deployed through the managed command again; contract remained backward-compatible. All checked data and ledger fields matched the pre-drill snapshot. Source diff from starting HEAD was empty before documentation updates. Eight provider-accounting regressions and strict types passed after returning to current.
- Data verification window 02:57:17.908Z → 02:58:36.627Z, 78,720 ms including tool round trips, two deployments and verification; not a service RTO or total user-facing outage measure. No Live rollback or publish of the historical candidate occurred.
- PASS for this module-scoped managed backend round trip. Whole-version platform UI restore, full-release rollback and Live recovery remain unverified; rollback gate stays PARTIAL. A GitHub/local source commit alone does not identify a recoverable platform version.


## Original media backup and retrieval — 2026-10-15 UTC

- Current media inventory: one asset, generated-nexus-forge-banner-htW.png, declared PNG / 1,191,209 bytes. Used the supported Macaly Assets → media actions → Download control rather than deriving an original URL from the optimized CDN address.
- Downloaded file is PNG, 1536 × 864 RGB, exactly 1,191,209 bytes; SHA-256 e6ec36540b03f43123ac7157365acefcbafd5d8941801bbf3c6e8772598c8171. This matches declared original format/size; no separate pre-existing original digest was available.
- Retained a private backup copy named nexus-forge-banner-backup-20261015.png, then independently retrieved it into an isolated restore-check directory. Byte comparison and SHA-256 matched, and the retrieved image decoded/rendered correctly. No media replacement, source/public copy, or production mutation was performed.
- Macaly App user uploads was separately checked with All files in both Development and Production: both reported 'No app files yet'. This is the observed inventory at drill time, not a guarantee about future uploads.
- PASS for backup/retrieval of the currently inventoried asset. Database snapshots remain temporary drill materials; durable table-backup storage, recurring backup frequency, retention, agreed RPO/RTO, and ongoing coverage for new assets are not established. The backup gate remains PARTIAL.


## Fresh retained database backup and managed restore — 2026-10-15 UTC

- Exported Live through the supported Database → Live → Export control. Snapshot nexus-forge-database-backup-20261015.zip: 1,535,848 bytes, SHA-256 92c0078bba61d36269b70753af7c517addb05aee06e8970338be115877ddb9fd; 2,009 documents across 34 user/auth tables, 0 stored files. This is a newer capture than the earlier 1,971-document snapshot.
- Saved the snapshot privately outside the transient Macaly sandbox, independently retrieved it, and verified exact byte equality and SHA-256. The database ZIP and any credentials/records inside it are not committed to GitHub or uploaded to public media storage. Public evidence contains only aggregate observations and the checksum.
- Captured a Testing safety snapshot. In the supported database UI selected Testing, imported the retrieved ZIP, and observed '2,009 rows imported'. get_project independently confirmed Testing quick-rabbit-810 and Live tame-rat-826 remained separate.
- Read-only verification in Testing matched all 34 table counts and 2,009 documents with zero mismatches; accepted LocalBoost mission remained approved/complete and the provider ledger retained one row. Returned Testing to its pre-drill snapshot afterward. Live was only exported, never imported over.
- PASS for a retained one-time database backup, retrieval integrity and isolated managed restore. Original media is separately covered by the previous asset drill. Recurring scheduling, retention duration, agreed RPO/RTO, backup freshness monitoring and an ongoing runbook remain open; no recurring automation was created. Backup gate remains PARTIAL for those policy/operating requirements.
