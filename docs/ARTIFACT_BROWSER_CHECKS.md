# Artifact browser checks — 2026-10-14

Artifact Forge now offers configurable interaction checks alongside structural verification. The test harness is separate from the generated artifact's own quality claims, but the saved reports are **client-reported browser evidence**, not trusted CI attestations.

## Use

1. Select the saved mission and artifact on Artifact Forge.
2. Open **Browser checks against saved acceptance criteria** beneath that artifact.
3. Add a check for a criterion from the saved mission. The mission needs an explicit `ACCEPTANCE CRITERIA:` section; requirements are not inferred.
4. Configure fill/click steps and at least one assertion using selectors from the artifact. ID selector hints and complete source inspection are available.
5. Run checks and inspect the observed per-step evidence. Cases run sequentially against one fresh page, so each case should establish its own inputs.
6. Inspect the saved receipt, or use **Use saved test plan** to repeat a compatible plan. Failed saves retain the completed report for retry.

Example for an artifact with `#amount`, `#calculate`, and `#result`: fill amount with 7, click calculate, assert result contains 14. Expected results must come from the acceptance criterion; the example does not certify an arbitrary artifact.

## Supported checks

- Fill input, textarea, or select fields, emitting input/change events.
- Click an element.
- Assert text contains an expected nonempty value.
- Assert an input/textarea/select has an exact value.
- Assert an element has visible layout bounds.
- Assert browser form/field validity rejects input.

A failing step stops the rest of that case; unexecuted steps are recorded as not run. Every planned criterion needs an assertion. Uncovered criteria and unexecuted cases cannot produce an all-criteria-passed result. Limits: 20 criterion cases, 12 steps per case, 25-second frame timeout.

## Execution and evidence boundaries

The iframe has only the `allow-scripts` sandbox token, an opaque origin, no referrer, and a restrictive content policy for connections, external assets, frames, and form submission. It gets the artifact and plan, not application credentials or authenticated API access. Expected strings are encoded into the harness. Parent-side result matching checks frame identity and a per-run challenge. Tests are declarative; no test-script strings are evaluated.

Controlled fixtures are exercised by the regression suite with JSDOM. This does not claim that every existing generated artifact has been run successfully in a production browser. Artifact scripts can fail, time out, or depend on unavailable external services. This runner does not validate real external services, downloads, user value, accessibility completeness, or visual quality.

Reports store the exact mission/artifact snapshots, saved criteria, plan, step results, coverage summary, runner version, operator, time, and audit receipt. Record/history APIs require mission ownership. The server checks snapshot currency and report shape and computes coverage; it cannot independently attest that a client genuinely executed the submitted results.

Browser reports never approve an artifact, dispatch delivery, or complete a mission. Existing structural checks and governed approval/delivery evidence remain separate. Historical snapshot differences are visible.

## Validation and remaining work

Regression checks cover working/broken HTML, form validity, missing/invalid selectors, markup encoding, coverage, stale snapshots, ownership, unchanged approval state, parent result matching, timeouts, selector hints, plan reuse, and failed-save retries.

The repeatable artifact-dom-v3 fixture suite and GitHub-verified CI receipts are implemented; see [benchmark evidence](BENCHMARK_CI_EVIDENCE.md). Exact saved artifact/mission/test-plan Chromium CI is now implemented; see [the exact CI workflow](EXACT_ARTIFACT_CI.md). Broader benchmark and external integration coverage remains open. The independent-verification and delivery milestones remain partial.

## Exact text acceptance

Artifact Forge offers **Assert text equals** in addition to **Assert text contains**. Equality compares the selected element's complete textContent literally, including nested text and whitespace. Expected 14 rejects observed 140. Empty expected text checks an empty element. Contains retains its existing substring semantics; choose it only when a substring is the intended acceptance condition.

New browser receipts use sandbox-dom-v2; old plans and receipts retain their meanings. Equality plans are validated and retained by the backend and run by the exact-snapshot Chromium runner. This is a backward-compatible action extension, with no change to the artifact-ci-v1 bundle/report envelope. New snapshot branches use the runner from main when published; existing published branches retain their original runner commit.

Controlled tests cover numeric substring rejection, whitespace, nested text, empty output, backend persistence and the explicit UI action. The exact Chromium CI self-test uses equality for its valid doubled result and a separate digest-bound negative control: 140 must fail an expectation of 14, and the next step must remain not-run. Negative-control reports are retained without being published as successful artifact evidence. All checks remain separate from approval, delivery and product outcome verification.

The current UI reads listWithExactText, which returns the latest ten owned reports with all supported actions. The pre-v2 list endpoint retains its original return types and omits unsupported equality plans within that same latest-ten window, so already-loaded older clients are not given actions they cannot interpret. It never rewrites equality as a contains check.
