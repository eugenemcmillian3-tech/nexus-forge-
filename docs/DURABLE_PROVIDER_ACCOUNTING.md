# Durable provider accounting — 2026-10-14

Managed inference now creates an owner-private invocation before making an AI request. Every current generative router call uses the shared accounting wrapper: Council, Research, Artifact generation/correction, Manifest blueprint/strategy, Intent Compiler, Portfolio discovery and Incident diagnosis. Manual provider health checks are diagnostics and remain outside this ledger.

## Attribution

Invocation IDs distinguish calls and stages. Mission-backed operations retain the owned mission ID. The mission runner explicitly passes its run ID through scheduled Council and artifact handoffs; the ledger validates that the supplied run belongs to the same owned mission. It does not guess a recent run. Direct operator calls have no runner ID. Planning that occurs before mission creation remains owner-private and unlinked; historical rows are not backfilled.

AI Providers exposes paginated selected-mission/all-owned history. Figures apply only to loaded pages. Reported charges are provider metadata, not reconciled invoice totals or a guaranteed spend cap. Missing prices and token components remain unknown.

## Persistence and recovery states

- pending: invocation prepared, but no finalization receipt is confirmed. This can include interruption before, during or after inference.
- succeeded/failed: the router returned a usable answer or failed, independently of usage coverage.
- recorded: all metadata callbacks observed by the wrapper were stored. This does not prove every provider attempt supplied metadata.
- missing: no eligible metadata callbacks were observed.
- gap: fewer reports were stored than observed.

Receipt ordinals make repeated saves idempotent and conflicting receipts invalid. The legacy usage-memory receipt and ledger report are written atomically. Completed invocation outcome/counts are immutable. Reports retain metadata only; prompts, generated content, credential values and raw exception details are not stored here.

If ledger preparation fails, no inference starts. If saving usage or finalizing the invocation fails after an answer, the valid answer is retained without an accounting-triggered retry. A generic warning is emitted; a saved gap or durable pending row remains reviewable. No polling, auto-replay or fabricated zero-cost reconciliation is introduced.

Pending/gap review requires correlating the invocation/stage/run with existing mission evidence and, where needed, provider billing. This version does not automatically repair lost metadata, replay inference, or certify billing completeness.

## Validation and release limits

Controlled tests exercise the actual router against convex-test persistence: successful mission/run attribution, receipt idempotency/conflicts, missing metadata, recorder and finalization faults, foreign ownership, provider failure and eight concurrent independent invocations. UI tests cover loading, scope, pagination, pending/gap visibility and explicit zero versus unknown charges. These are fault/concurrency tests, not sustained production capacity certification.

The code-side attribution and gap-visibility implementation is complete for the listed paths. Production restore/rollback, alert delivery and representative workload evidence remain separate. Macaly recovery UI sign-in was attempted; automated review blocked Google navigation, so those drills remain unperformed pending the specific sign-in approval.
