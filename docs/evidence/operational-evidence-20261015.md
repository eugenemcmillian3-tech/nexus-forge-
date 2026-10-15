# Operational evidence — 2026-10-14/15 UTC batch

Scope: one operational-evidence batch covering backup/restore, rollback, recovery, alert delivery, sustained workload and provider accounting for the current NEXUS FORGE operator product. Live was never restored over, rolled back, or disrupted. All drills except the single live research call ran against an isolated local Convex backend (anonymous deployment at 127.0.0.1:3210) seeded from a Live snapshot export. Historical authentication/approval evidence was not repeated. All 16 feature pages and the guided order are untouched.

## 1. Backup/restore — PASS for local snapshot/table restore, with limits

- Live snapshot export (`/tmp/nf-live-snapshot.zip`): 3 seconds, 1,532,578 bytes, SHA-256 `b111058d56bbed44716c2b16d50a33aa4e834318f022d7f6601f17bdf492ae3e`. 1,971 documents across 34 tables. Convex `_storage` held 0 files; snapshot import confirmed 0 files.
- Isolated restore: import into a fresh isolated local backend (own local deployment config, no original `.env.local`) completed in 2.8 seconds with 1,971 documents imported.
- Restore verification: mission `k97511n9ds6vq0g5vkym5p2pjd8g756v` restored approved/complete with research rows and two artifacts; delivery `ks746pr34gsdd979j32f0x5scd8g6vk2` and its workflow record restored; foreign-owner access correctly denied.
- Limits: the restore target is an isolated local Convex backend, not Managed Testing (platform Testing selection was unavailable this session). Uploaded assets held outside Convex (0 Convex files) need a separate backup/recovery path. RPO/RTO targets are not yet agreed or timed end-to-end.

## 2. Rollback — PASS as an isolated rehearsal, with a documented compatibility boundary

- Phase A (incompatible baseline): pre-accounting code (local commit `7102089`, the code state before the provider-accounting batch; the runbook baseline `69637006dc7ff1839665f78d4f6aa309768040bc` remains the GitHub-side reference) pushed to the isolated backend at 23:57:56Z. Convex deleted the `providerInvocations` indexes immediately (rows survived, unindexed) and the accounting functions were absent. Conclusion: code rollback across the accounting boundary is not backward-compatible with ledger data. Managed deploys block contract removals to Live.
- Phase B (compatible known version): version `150241c` deployed at 23:59:46Z (indexes recreated), verified against restored data (ledger query with recreated indexes, run state, ownership denial), then the current code was restored at 00:00:18Z and re-verified (4 ledger rows, accepted mission complete, drill run paused). Total rehearsal about 2.5 minutes including verification.
- Live was not rolled back. File recovery is separate from code rollback (0 Convex files; external assets untouched by backend code changes). Macaly UI version restore still requires operator Google sign-in, which was previously blocked by automatic review.

## 3. Recovery — PASS in the isolated drill environment

- Fresh governed mission `k9786d4gbfcksh5t6v4hqbad4x8g9b9g` (create → approve → portfolio decision → executeApprovedMission) started run `m17fmeq63pazhcb0j6vf6x0xq98g979f` at 2026-10-14T23:55:10.555Z.
- Provider keys are unavailable to any local backend by sanctioned means (platform guard), so provider calls failed fast. This is a controlled provider-unavailability drill, not a successful-provider interruption drill.
- Bounded retries held: three orchestration attempts produced exactly three unique ledger rows (`council-plan`, planner, mission and run attributed) and six agentRuns — no duplicates. Retries capped at 2.
- Hard crash: backend SIGKILL at 23:56:31Z; restart ready at 23:56:48Z (17 seconds). After recovery the scheduled tick parked the run at `agent_coordination_blocked` / `paused` with "human review required"; 0 deliveries, 0 incidents for the drill mission; ledger rows unchanged.
- Timeout-escalation path also observed in the isolated environment: an old restored run past deadline transitioned to `blocked` / `timeout_escalation` and recorded an incident with a matching incident-diagnosis ledger row.
- Limits: drill environment lacks provider credentials; Managed Testing recovery drill still pending platform availability.

## 4. Alert delivery — drill dispatched, delivery confirmation PENDING

- 2026-10-15T00:10:18Z: dispatched existing read-only workflow `nexus-forge-artifact-checks.yml` on `main` with a nonexistent snapshot input. Run [38658472244](https://github.com/eugenemcmillian3-tech/nexus-forge-/actions/runs/38658472244) failed at the intended "Prepare bounded snapshot input" step; all later steps skipped; `contents: read` permissions; no production side effects. A temporary drill branch was created and deleted; `main` was untouched.
- Delivery evidence requires the operator to confirm the GitHub failure notification for run 38658472244 reached their configured destination (email/web). An API run failure alone is not delivery evidence, so this gate stays open until confirmed.

## 5. Sustained workload — PASS on the isolated backend, with scope limits

- 90 seconds at concurrency 4 under an authenticated operator identity against the isolated backend seeded with restored Live-scale data (51 missions, 1,971 documents).
- 270,213 owner-scoped requests across five representative read paths (mission-filtered ledger, owner ledger, mission list, portfolio decision snapshot, run state): 0 failures, 0 throttled; p50 1 ms, p95 2–3 ms, max 54 ms. Recovery probe after load: 5 ms.
- Limits: local backend, not Managed Testing/cloud; representative authenticated reads only — no sustained provider inference (bounded by provider budget). Not a production SLA.

## 6. Provider usage accounting — PASS for live attribution; billing reconciliation UNKNOWN

- Live representative mission call: `research:search` on accepted mission `k97511n9ds6vq0g5vkym5p2pjd8g756v` as its owner, 2026-10-15T00:08:16.329Z → 00:08:17.677Z.
- Live ledger row `p97dfs6pz17xw654vskndk83fd8gbbn6`: outcome `succeeded`, usageStatus `recorded`, observedReports 1, provider-reported usage groq / `openai/gpt-oss-20b`, 1,288 prompt + 928 completion = 2,216 tokens; ownerKey, missionId and stage `research-discovery` attributed; no runner ID for a direct operator call, by design.
- Runner attribution (missionRunId) verified separately in the drill environment on the `council-plan` rows. The owner-scoped `providerUsage:history` query (the `/providers` data path) returns the live row.
- Billing reconciliation: no provider billing access is available, so actual charges remain unknown; token metadata is not billing evidence. Historical invocations before the ledger deployment are not backfilled.
