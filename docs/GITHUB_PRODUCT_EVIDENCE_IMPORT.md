# Commit-pinned GitHub product evidence import — 2026-10-14

Portfolio Intelligence can explicitly import a product-outcome-v1 JSON report from the project repository eugenemcmillian3-tech/nexus-forge-. This uses the existing server GITHUB_ACCESS_TOKEN connection. It is a repository-report ingestion path, not direct access to an analytics provider.

## Operating sequence

1. Select the owned mission and prepare real product observations using the contract shown in Portfolio → Product & Business Outcomes → Import a committed GitHub outcome report.
2. Commit the report to nexus-forge-outcomes/<missionId>/<reportId>.json in the project repository. Report IDs allow 1–64 letters, numbers, underscores or hyphens. Repository readers can see report contents.
3. Enter the exact full 40-character source commit SHA and report ID, then explicitly import.
4. Inspect the private product receipt: repository, path, commit, Git blob SHA and report SHA-256. Manual observations retain operator-recorded provenance; imported reports use github-report.
5. Use compatible product receipts in Verified Learning Engine. Comparison snapshots retain import provenance alongside measurement methods, periods and samples. Baseline imports must be recorded before the reviewed lesson handoff, under the existing chronology rules.

The importer only reads a previously committed report; it does not publish report content or request analytics credentials. The source repository is fixed to the NEXUS FORGE project, not nexus-forge1/no-dispatch.

## Report contract

JSON version must equal product-outcome-v1. Fields are exactly version plus the existing product outcome inputs:
- missionId, metric, observed, target, sampleSize;
- periodStart and periodEnd as completed-period epoch milliseconds;
- method, evidence string array and notes.

All existing metric/sample/period/evidence constraints apply. Task-success percentages and target comparisons are computed from source observations on the server. Reports cannot supply ownerKey, actual, targetMet, provenance or an import receipt. A template with deliberately invalid zero dates is available in the app; replace every placeholder with actual observations.

## Source verification and storage

An authenticated owned-mission lookup occurs before any external request. The server uses a fixed GitHub API origin/repository and mission-specific path at an exact commit, rejects redirects, and bounds fetch time. Response streaming is capped at 128 KiB; decoded report bytes are capped at 64 KiB.

The importer validates regular-file metadata/path, base64, byte size, the Git blob SHA computed from exact bytes, valid UTF-8 JSON, version/mission/allowed fields, and the existing typed input validators. It retains a SHA-256 digest of exact report bytes. Failed lookups/validation create no observation.

Only the internal import mutation assigns github-report provenance. Source identity is owner + repository + commit + path; repeat imports reuse the original immutable receipt, while a new source commit can create a new historical observation. Existing manual records remain valid; import metadata is optional on older records.

Secrets stay server-side. Upstream error response bodies are not exposed. No approval, delivery dispatch, strategy promotion or mission completion changes.

## Interpretation and remaining work

GitHub authenticates the source lookup and preserves a reviewable repository identity. Repository authors control report figures. This does not independently verify customer counts, financial figures, analytic truth or causal strategy effectiveness. Underlying evidence references are retained, not fetched or certified.

Direct analytics-provider ingestion, independently reconciled real outcomes, repeated representative comparisons and actual Council retrieval evaluation remain open. No new workspace is added.

## Validation

Controlled mocked-GitHub tests cover owned/anonymous/foreign boundaries before network access, exact project URL and server authorization, SHA/size/path mismatches, forbidden report claims, idempotent imports, bounded responses, upstream error handling, computed rate/target results and unchanged mission approval. UI tests cover visibility disclosure, explicit source-only submission and preserved selectors after failure. These tests do not claim a real external analytics report was imported.
