# Lesson retrieval evaluation — 2026-10-14

Research & Memory now compares the existing relevance-ranked memory content search with a newest-five learning-lesson baseline. This is an evaluation tool on the existing feature page; it adds no workspace and does not alter Council retrieval.

## Operating sequence

1. Browse Memory & Lessons, choose Learning lessons, and identify expected relevant lessons before running the comparison. Copy 1–20 distinct receipt IDs.
2. In Lesson retrieval evaluation, enter a search question and choose all owned lessons or the selected mission. Enter expected receipt IDs and explain why they are relevant.
3. Run & save retrieval comparison. The backend validates ownership, category, scope, bounds and duplicate labels, then retrieves both methods from one query snapshot.
4. Inspect the saved scores, expected IDs, ranked result IDs, excerpts, sources, linked strategy receipts where present, and evaluation scope. Continue to Verified Learning Engine for measured strategy comparisons.

The candidate is the top five results from the existing search_value full-text index, filtered to the authenticated owner and learning-lesson category and optionally mission. The baseline is the newest five learning lessons in the same scope, ordered by creation time. Neither receives client-supplied rankings or scores.

## Metrics

- Precision@5: expected relevant hits divided by five. Empty result slots count as misses.
- Recall@5: hits divided by the number of distinct operator-labeled expected lessons.
- Reciprocal rank: inverse of the first expected result's one-based rank, or zero when no expected result is returned.
- A search with no results records zero scores, not a pass. With more than five expected lessons, recall@5 cannot reach one.

Labels are operator judgments and can be incomplete or biased. These metrics describe one saved comparison, not statistical significance, independent relevance verification, or a platform-wide quality claim. Scores should be compared on representative questions with consistent labels and corpus conditions.

## Provenance and boundaries

Receipts retain version lesson-retrieval-v1, owner, scope, query, rationale, timestamp, expected lesson IDs, both observed rankings and scores, and excerpts capped at 500 characters. Reviewed lesson records retain their linked strategy ID for traceability. Excerpts are bounded snapshots, not a complete archive of original documents.

Saved evaluations use the existing private memories table under retrieval-evaluation and an owner/category index. History shows the latest 20 evaluations. No external publication or model request occurs. Generic public memory writes cannot create this reserved receipt category. Evaluation records are excluded before sampling Council learning and adaptive-preflight context so they do not displace useful lessons.

Council planning still uses its separate recent-history window. This tool measures memory-browser retrieval, not the actual Council prompt selection and not whether reusing a strategy caused better outcomes. Reviewed-lesson application and comparable subsequent cost/readiness outcomes can now be recorded separately; see [strategy reuse comparisons](STRATEGY_REUSE_OUTCOMES.md). Broader relevance corpora, causal effectiveness, business outcomes and repeated-run analysis remain open.

Nothing in this feature approves missions, promotes strategies, dispatches delivery, or changes completion.

## Validation

Regression cases exercise actual indexed search over controlled private data: an older relevant lesson missed by the newest-five baseline, empty matches, ownership and mission/category boundaries, invalid labels, generic-write forgery rejection, retained snapshots after edits, unchanged mission approval, explicit UI submission and error recovery. Controlled data is validation evidence, not a claim that a real operator's relevance corpus has already been evaluated.
