# Exact saved artifact Chromium CI — 2026-10-14

Artifact Forge can publish and test the exact saved HTML, mission text, acceptance criteria, and declarative plan attached to a saved browser test run. This extends the fixture-only CI suite; it does not replace the browser-reported history.

## Operating sequence

1. On Artifact Forge, configure browser checks against explicit saved acceptance criteria and save a browser report.
2. In that saved report's **Exact snapshot CI** section, review the publication description. **Publish saved snapshot & run CI** sends the artifact, mission, and test plan to the project GitHub repository, where repository readers can see them. It creates a dedicated test branch, not a deployment.
3. Open that snapshot's filtered CI runs and wait for **Exact artifact Chromium checks** to complete.
4. Paste the completed run URL and use **Verify & save exact CI report**. Inspect observed CI steps and the linked GitHub evidence.

Publication is explicit. No snapshot is uploaded merely by opening a page, saving a browser report, or approving an artifact. A historical artifact/mission snapshot cannot be newly published; existing historical evidence remains inspectable.

## Snapshot and execution contract

- Bundle version: `artifact-ci-v1`; size limit: 200 KB.
- Identity: SHA-256 of exact serialized bundle bytes, a dedicated `nexus-forge-checks/<saved-run-id>` branch, and immutable source commit.
- Runner: Playwright 1.64.0 and matching Chromium image, non-root user, Chromium sandbox enabled.
- Container: no network, no passed credentials, read-only root/input, dropped host capabilities, bounded CPU/memory/processes, writable temporary storage and report output only.
- Seccomp: based on Playwright's published profile, with namespace-local chroot allowed so Chromium's sandbox can initialize. No host capabilities or root privileges are added.
- Execution: declarative fill/click/text/value/visibility/invalid-input checks, not arbitrary test-script strings; one fresh browser context per CI job.
- Wall limit: 180-second container execution. A startup/runner error records not-run steps and cannot become a pass.
- The browser cannot call authenticated platform APIs or real external services. External integrations, actual downloads, broader accessibility, and business outcomes remain separate verification work.

The trusted controller runs outside the artifact's page context. After the isolated container exits, a separate GitHub Actions step publishes per-step observations as **NEXUS artifact snapshot v1**, with the snapshot digest as external ID. The JSON report is also retained as **exact-artifact-ci-report**.

## Import verification

The server independently reads GitHub metadata and the GitHub Check. It verifies:
- project and head repository, workflow path, branch, source commit, completion, and exact run attempt;
- matching completed CI job and GitHub Actions check issuer;
- snapshot SHA-256, saved test-run ID, report version, and check details URL;
- per-step result shape and criterion coverage, with the conclusion recomputed from steps.

Mismatched commit/digest/issuer/attempt/report shapes are rejected. Matching imports are idempotent; conflicting verified receipts cannot replace prior evidence. A fresh saved test run is required for another verified attempt.

The CI snapshot and browser-report results remain distinct. Neither changes artifact approval, delivery authorization, dispatch state, or mission completion. These are repository-controlled GitHub Check receipts, not a claim of independent third-party certification.

## Validation

The workflow's controlled exact-snapshot self-test successfully ran Chromium in CI after correcting namespace-local chroot permission. Actual runtime test evidence: [run 38601705730](https://github.com/eugenemcmillian3-tech/nexus-forge-/actions/runs/38601705730). This validates the runner path; it does not claim that an operator's existing artifact has already been published or tested by this feature.

Regression coverage checks ownership, stale snapshots, exact uploaded bundle/digest, one-time dispatch, retry after dispatch failure, wrong provenance rejection, immutable/idempotent imports, unchanged approvals, and explicit UI actions.

Upstream runtime guidance: [Playwright Docker documentation](https://playwright.dev/docs/docker). The copied seccomp baseline comes from microsoft/playwright `utils/docker/seccomp_profile.json`; its upstream license is retained beside the runner.

Next: broaden criterion/benchmark coverage, evaluate memory retrieval effectiveness, and collect real product outcome measurements. No new workspace is added; all 16 product pages remain in the guide.
