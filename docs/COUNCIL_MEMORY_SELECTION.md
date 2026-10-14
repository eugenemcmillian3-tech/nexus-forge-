# Captured Council memory selection — 2026-10-14

AI Council now retains prospective memory-context receipts for planner attempts and supports operator-labeled relevance evaluation of those exact selections. This is distinct from the memory-browser search benchmark.

## Guided use

1. Run planning through the existing explicit approved-mission action when planning is needed. Opening the inspector never runs planning.
2. In AI Council → Captured Council Memory Selection, inspect the selected memory IDs, sources, routing channels, saved mission input and exact rendered learning/preflight text.
3. Review status: prepared means captured before the planner attempt; planner-responded means a planner response returned. A failed provider attempt retains prepared status. Neither status establishes attention to individual memories or full Council completion.
4. Copy expected relevant memory IDs from Research & Memory and explain their relevance. Eligible categories are learning-lesson, verification-outcome and operational-recovery.
5. Score the captured selection. Inspect precision, recall and missed relevant memory IDs alongside the retained context.

Only future planner attempts receive receipts. Prior live runs are not reconstructed or relabeled. The inspector shows the latest 10 context receipts and latest 20 evaluations per receipt.

## Selection and provenance contract

The existing newest-history policy remains council-recent-context-v1:
- learning context selects from the newest 60 owner-scoped memory rows after excluding browser retrieval evaluations and strategy reuse comparison logs;
- learning outcomes select up to 10 verification outcomes; learning lessons select up to 10 learning-lesson/recovery rows;
- adaptive preflight selects from the newest 80 rows with its existing risk, recovery and reuse caps;
- reviewed lesson formatting, applicability warnings and advisory framing remain unchanged.

Both contexts now read one consistent database snapshot. Existing internal getLearningContext and preflight APIs remain compatible. Captured rows retain original value, formatted learning value when applicable, source, confidence and channel labels. Multiple channels count one memory ID once. The source corpus creation cutoff is retained to reject labels created after selection.

Immediately before the planner call, the runtime saves mission text and exact rendered learningContext/preflightContext strings. After a planner response, only status/respondedAt change; captured text stays immutable. A snapshot over 700,000 UTF-8 JSON bytes stops before the planner request with an actionable error. Research context is retrieved separately and is outside this memory-only receipt. These are contextual provenance receipts, not whole-prompt/provider transmission attestations.

## Evaluation

Expected IDs must be distinct, owned, eligible and present before the captured corpus cutoff; choose 1–20. The backend computes:
- hits: expected IDs present in the unique selected IDs;
- precision: hits / unique selected IDs, or zero for an empty selection;
- recall: hits / expected IDs.

Separate channels have no single relevance ranking, so no reciprocal-rank score is fabricated. An empty or missed selection records zero relevance rather than a pass. Labels and rationale are operator judgments and can be incomplete or biased; the score does not independently prove relevance, statistical significance, model influence or improved outcomes.

Evaluations live in a separate owner-private table linked to immutable context receipts. They do not change selection, approve/complete missions, promote strategies or pollute advisory memory windows. No extra model call is made by inspection or evaluation.

## Validation and next work

Controlled-provider tests run the actual Council orchestration path and assert that the planner prompt contains the exact saved learning/preflight strings. They verify policy parity with prior queries, multiple-channel deduplication, unchanged snapshots after memory edits, planner-failure status, missed/empty selection scores, ownership, duplicate labels and post-corpus labels. UI tests cover prepared-versus-responded wording, explicit reference-only evaluation and preserved drafts after rejection.

No additional live provider acceptance/authentication exercise or fabricated historical receipt was introduced. Next collect representative relevance labels and compare candidate Council selection policies under the same constraints; repeated product outcomes remain separate evidence work. All 16 feature pages remain in the guide.
