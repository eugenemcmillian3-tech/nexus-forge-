# Advisory Council memory policy comparisons

## Guided workflow

1. Run an explicitly requested planning attempt through the existing approved-mission workflow.
2. Open AI Council → Captured Council Memory Selection. Inspect the actual context and the separately captured advisory candidate.
3. Save 1–20 expected relevant memory IDs with a rationale.
4. Choose “Compare candidate using these saved labels”. Inspect both precision/recall scores and signed percentage-point changes.

The comparison accepts only the saved evaluation ID. The backend reads both immutable selections and the same saved labels; it never trusts client scores. Repeating a comparison returns its original receipt.

## Candidate contract

The current live policy remains council-recent-context-v1. The candidate council-lexical-same-corpus-v1 ranks eligible learning-lesson, verification-outcome and operational-recovery rows from the same owner-scoped newest-80 source snapshot. It counts distinct matching mission terms in each memory key/value. Terms are lowercase ASCII alphanumeric tokens of at least three characters, excluding a small fixed stop-word set, capped at 40 distinct terms. Ties use descending creation time then ascending memory ID.

The candidate's unique-memory budget equals the actual current selection count. It is captured before the planner request but is never included in the planner's learning/preflight context. The receipt retains its selected IDs, values, policy version, budget and mission terms. The existing 700,000-byte snapshot limit includes the candidate.

## Evidence limits

Comparisons are owner-private, immutable, idempotent per saved label evaluation and linked to the mission/context receipt. Historical receipts without candidates cannot be reconstructed from changed current data. Both gains and regressions are retained. Operator relevance labels can be incomplete or biased; these scores do not establish statistical significance, model attention, business impact or causal effectiveness. A same-count budget is not a token-cost comparison.

No automatic policy promotion, provider request, approval, mission completion or memory-window pollution occurs. All 16 feature pages remain separate. The next step is representative relevance labeling across varied missions and repeated outcome comparisons before considering a live policy change.

## Validation

Controlled orchestration tests verify same-budget candidate capture, exclusion from the planner prompt, gains and regressions under saved labels, immutable snapshots after source edits, idempotency, foreign/anonymous access rejection and honest historical absence. Existing context and UI tests remain in place.
