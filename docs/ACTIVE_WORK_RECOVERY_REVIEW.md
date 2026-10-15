# Active-work recovery review

Review date: 2026-10-15 UTC. Scope: source inspection of convex/missionRunner.ts, convex/forge.ts, convex/providerAccounting.ts and convex/providerUsage.ts. This is a source review, not an observed production duplicate, live interruption drill, or proof of exactly-once execution. Platform project bphntw8kdojl9qvuifywyjtk; source eugenemcmillian3-tech/nexus-forge-. Dispatch QA nexus-forge1/no-dispatch is separate.

## Implemented provider-stage batch — 2026-10-15 UTC

- Added internal providerRecovery.reserve/complete and private providerResults storage. For runner-linked requests, transactional admission checks all matching invocation rows. Exactly one succeeded invocation with a matching request digest and persisted answer can be reused. Pending, failed, ambiguous or legacy succeeded-without-answer work blocks network replay; changed prompts/token limits require explicit new work.
- Answer bytes (maximum 256 KiB UTF-8) and invocation success commit atomically. A failure to confirm completion throws without marking the answered call failed. A lost acknowledgement after commit is recoverable on the next matching call. A crash before commit remains uncertain and blocked; no provider-side exactly-once claim is made.
- Provider answers are not added to the public ledger history shape. Recovery functions are internal; owner/mission/run identity is checked before reuse. Direct operator invocations remain independent. No expiry or automatic deletion of recovery results is configured; they currently follow database backup/access controls. A retention policy still needs to balance privacy/storage against recoverability.
- All 13 controlled provider-accounting tests passed in edge-runtime, including active contender, delayed replay, result-save failure, lost acknowledgement, changed request, immutable answer, legacy row and size bound. Full suite: 376 tests / 63 files passed.
- Managed deploy to isolated Testing succeeded; public contract backward-compatible. No real inference interruption or managed-host crash was induced.
- Remaining: execution-wide Council/tick claiming and fencing, idempotent domain evidence/artifact commits, stable stage-context snapshots, recovery operator controls, managed interruption drill and production publication verification. Reusing the provider answer alone does not prevent duplicate domain evidence writes. Existing runner retries that change their context or encounter failed/legacy work stop for review rather than silently reissue inference.

The findings below describe the reviewed pre-fix boundaries. The first two are narrowed by this provider-stage batch; the execution-wide findings remain open.

## Findings

| Priority | Boundary | Finding | Consequence |
| --- | --- | --- | --- |
| High | providerUsage.begin | Transactional exclusion filters only outcome=pending for the same mission/run/stage/role. A succeeded row permits another reservation. | A worker arriving after finalization can repeat the provider call. Existing pending-call concurrency evidence does not cover this case. |
| High | providerAccounting.callManagedAi to consumer persistence | Provider completion is finalized before the answer returns to the caller; providerInvocations does not retain the answer. Council evidence and artifact creation happen in later mutations. | An interruption after finalization but before domain persistence leaves a completed ledger record without a recoverable answer. Replaying the stage can call inference again. |
| High | missionRunner.tickInternal to forge.orchestrateInternal | Runner reads, state writes and scheduling are separate operations. Council orchestration has no execution-wide atomic claim in the inspected path and runs the planner and waves again on entry. | Multiple ticks can schedule overlapping orchestration. Provider-stage exclusion narrows overlap while pending but cannot serialize the whole pass or fence late writes. |
| Medium | forge.runAgent | Agent status changes to running before provider admission. Its catch changes status to blocked and writes error evidence. | A rejected competing worker can overwrite the visible status of another worker's work. A claim must precede status changes, and writes must verify claim ownership. |
| Medium | missionRunner exception path | Error handling uses retries from the earlier runner snapshot and unconditionally writes state. | Overlapping handlers can write stale retry/stage state. Atomic claims or compare-and-set transitions are required beyond provider accounting. |

## Preserve existing behavior

Keep ownership checks, mission approval, resource/preflight checks and delivery approval intact. Preserve provider accounting and pending reservations; never expire uncertain work simply to unblock a retry. Do not replay accepted missions or dispatch deliveries to test this finding. Direct operator requests without a missionRunId currently have independent invocation semantics; do not silently convert those requests into a permanent once-per-mission lock.

## Next implementation batch

1. Define a durable logical work identity for a runner stage, plus explicit revision/attempt semantics. A retry must resume the same logical work; an intentional regeneration must have a new identity. Validate mission/owner/run identity in the transaction.
2. Atomically claim orchestration and artifact work before any status/evidence writes or scheduling side effects. Require a fencing token or equivalent compare-and-set check for every completion/failure/state write. A competing worker must leave the winning worker's state unchanged.
3. Persist provider answer and completion together in a private, owner-scoped recovery record, with bounded response size and appropriate retention. Tie domain evidence/artifact commits to that logical work identity. Resume from the persisted answer without inference when completion exists; prevent duplicate domain inserts.
4. Preserve an explicit uncertain state if execution may have reached the provider but no answer was durably committed. Provider-side idempotency or response retrieval must be established before automatic replay of that boundary. Storing an answer after the network response alone cannot eliminate the response-to-storage crash window.
5. Add backward-compatible fields/contracts and migrate deliberately. Existing succeeded ledger rows have no durable answer; do not fabricate one or automatically treat them as safely replayable. Existing pending rows require review.

## Required acceptance evidence

- Two contenders while the first provider request is held: one network call and no losing-worker status overwrite.
- A delayed contender after the first invocation succeeds: reuses the durable result, zero additional network calls, and one domain result.
- Interruption after answer persistence but before evidence/artifact persistence: resume commits one domain result without inference.
- Interruption before answer persistence with uncertain provider execution: blocks for review and does not infer safe retry.
- Old fencing token cannot write state after a newer authorized attempt; stale tick cannot regress a completed stage or its retry counter.
- Explicit regeneration gets a new logical identity; independent stages and direct operator invocations retain documented behavior.
- Owner isolation and ledger attribution remain intact, including legacy rows and accounting-save failures.
- After controlled tests, perform a bounded isolated Testing drill with safety snapshot and verified target identity. A mocked fault test must remain labeled mocked; no managed-host crash or full recovery guarantee follows from it.

## Decision

Active provider reservation exclusion remains valid for its demonstrated pending-call scope. Integrated recovery remains PARTIAL and full production-readiness sign-off remains HOLD. Next engineering priority is durable logical work identity, atomic claiming/fencing and persisted-result recovery together; do not close this gap by merely rejecting all later succeeded-stage requests or disabling useful retries.
