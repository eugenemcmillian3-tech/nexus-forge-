# Council and tick execution claims — 2026-10-15 UTC

Scope: NEXUS FORGE platform project bphntw8kdojl9qvuifywyjtk; source eugenemcmillian3-tech/nexus-forge-. Testing quick-rabbit-810, Live tame-rat-826. No dispatch QA repository changes.

## Implemented

- A transactional mission/scope claim precedes Council writes and runner tick decisions. Runner ticks re-read state after admission. Council and tick scopes are separate so polling can observe active Council work without executing another Council pass.
- Claims never expire or transfer automatically. Failed/unconfirmed actions retain an uncertain reservation. Completed runner Council outcomes are retained by runner identity and returned to delayed requests without entering the action body again. Explicit direct Council requests use separate identities, while sharing active exclusion for the mission.
- Council waves await every child promise before orchestration failure handling. Guarded Council status writes require an active claim; blocked/completed runners and revoked/completed/cancelled missions reject new writes. Existing internal argument contracts remain accepted for older callers; workers already started before this release do not acquire the new token retroactively.
- Council findings, final summary and learning-lesson writes use deterministic effect receipts in the same transaction as their domain writes. Exact repeated commits are no-ops, conflicting payloads are rejected, and new writes after closure are rejected. Legacy internal calls without a token retain prior behavior.
- Specialist row completion cannot advance artifact generation while the claimed final Council pass is running. Uncertain Council work parks the runner at execution_recovery. Runner artifact generation remains inside its tick claim.
- Ordinary tick contention can schedule up to three one-second handoff retries; uncertain reservations do not auto-reschedule or allow takeover.
- Mission Control displays owner-authorized active/uncertain reservation metadata and recovery links. It exposes no automatic reset, lease expiry or inference replay control. Completed Council summaries are not included in the unresolved-status query.
- Existing 16-page navigation, authentication, approvals, provider routing and delivery controls remain in place.

## Validation

Twelve edge-runtime backend tests passed in __tests__/execution-claims.test.ts. They cover active contenders, delayed completion replay, interrupted work, lost completion acknowledgement, atomic evidence/summary/lesson deduplication, conflicting payloads, stale tokens, cross-mission tokens, terminal-runner fencing, ordered handoff, contention behavior, owner isolation and concurrent completed-mission reconciliation.

The actual Council action integration test used controlled provider responses: one accepted pass made eight mocked provider calls; a simultaneous runner contender and a simultaneous direct contender were rejected before adding domain records. A later replay returned the same Council outcome, with unchanged evidence/memory/selection-receipt counts and no additional provider calls.

Mission Control recovery tests passed, including uncertain-work guidance without a reset/replay control. Full regression suite after functional changes: 389 tests across 64 files passed.

Managed Testing deployment succeeded with a backward-compatible public contract. This verifies deployment compatibility, not a real managed-host interruption. Publication and post-publish probe observations must be checked separately.

## Remaining boundaries and next work

This does not establish exactly-once external inference/delivery or automatic recovery after a host crash. An interrupted claim stays reserved; operator recovery must verify the old worker has stopped and inspect saved provider/domain outcomes before any release or new attempt. No automatic claim-reset endpoint was added.

Provider response loss before durable persistence remains uncertain. Stable context snapshots, explicit reviewed recovery controls, a bounded managed interruption drill and full-service recovery measurements remain open. Manual independent artifact requests are outside tick serialization. Old pre-claim workers and legacy tokenless internal callers are not retroactively fenced. Claim/effect/result retention and storage growth need an operating policy; direct transient claim IDs may remain referenced by retained private effect receipts after the transient claim closes.

Recovery remains PARTIAL and full production-readiness sign-off remains HOLD. The Council/tick locking and Council duplicate-evidence engineering batch is complete for the tested scope.
