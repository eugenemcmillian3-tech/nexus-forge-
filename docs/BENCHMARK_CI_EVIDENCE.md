# Artifact DOM benchmark CI evidence — 2026-10-14

`artifact-dom-v2` is a repeatable **fixture-suite** baseline, not certification of a user's generated artifact.

## Suite

Fourteen versioned cases exercise the same declarative interaction harness used by Artifact Forge:

1. Fill/click/assert a correct doubled result.
2. Recompute zero after an earlier result to catch stale state.
3. Reject empty required input with DOM validity checking.
4. Detect an incorrect computation (negative control).
5. Detect an inert button (negative control).
6. Detect a missing output element (negative control).

7. Preserve multiline textarea values.
8. Select an option and observe change behavior.
9. Reject malformed email.
10. Reject out-of-range numeric input.
11. Restore field defaults through reset.
12. Detect an incorrect exact field value (negative control).
13. Reject an invalidity assertion on valid input (negative control).
14. Reject filling a non-field and skip dependent assertions (negative control).

Existing v1 receipts remain historical v1 evidence. New imports require the v2 job and step; an old v1 run cannot be relabeled v2.

A negative control succeeds as a benchmark when the runner detects the expected assertion failure. CI runs these authored fixtures with JSDOM. It does not claim full-browser layout, arbitrary generated artifact functionality, external integration, deployment readiness, or business outcomes.

Catalog: `convex/artifactBenchmarkCatalog.ts`.
Suite: `__tests__/artifact-behavior-benchmark.test.ts`.
CI job: **Artifact DOM benchmarks v2** in `.github/workflows/ci.yml`.
Report artifact: **artifact-dom-v2-report**, containing `artifact-dom-v2.json`.

## View and save evidence

Open Capability & Reliability, inspect the benchmark catalog, then follow **Open CI runs & benchmark reports**. Choose a completed NEXUS FORGE CI run containing the benchmark job, copy the run URL, and use **Verify CI run & save receipt**.

The server:
- accepts only canonical run URLs for `eugenemcmillian3-tech/nexus-forge-`;
- fetches GitHub run metadata and jobs for that exact attempt;
- checks repository/head repository, workflow path, commit SHA, completion, suite job, and benchmark step;
- derives the suite outcome from GitHub's job and step conclusions;
- records an operator-private receipt with commit, run, attempt, workflow, suite version, and observed outcomes;
- deduplicates matching attempts and retains reruns as separate receipts.

Only the server action can write receipts through an internal mutation. The browser supplies a run URL, not pass counts or a claimed conclusion. Failed lookups create no receipt. Failed or unexecuted suites remain visible as failed/not run rather than being converted to passes. Saved history is limited to the latest 20 receipts per operator.

The receipt verifies GitHub's recorded metadata. It does not download/validate individual JSON report assertions or provide a signed attestation. The exact source commit remains reviewable in GitHub; repository maintainers control the workflow and tests. An overall workflow failure does not automatically mean the fixture benchmark job failed, and vice versa, so both conclusions are shown.

No artifact approval, delivery state, or mission completion changes when recording a fixture-suite receipt.

## Validation and next priority

Tests cover positive and negative fixture behavior, canonical URL boundaries, wrong workflow/commit/incomplete jobs, exact attempts, duplicate imports, separate reruns, operator isolation, failed lookups, and UI recovery.

Exact saved-artifact Chromium CI is now implemented separately; see [snapshot CI](EXACT_ARTIFACT_CI.md). Next add broader browser/integration benchmark cases and measure retrieval/strategy effectiveness. Roadmap milestones 7, 12, 13, and 18 remain partial.
