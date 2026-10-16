# Real user journey — October 16, 2026

## Result

PARTIAL. A real reserved Testing user completed mission creation/approval, six-agent configured-provider Council planning, cited research, artifact generation, revision, verification/approval and QA delivery dispatch. GitHub artifact validation, build and tests passed. The result callback returned HTTP 500; deployment was skipped. No deployed success or outcome completion is claimed.

Mission: k9716ne11cckst498bdnnq201h8gdp1c
Title: User journey QA — Bakery landing page — 2026-10-16 2211
Approved revision: j97b7q5ey7dpxbhws97d9zjve18gckfh
Delivery: ks713gsmma2nhrak8f5vhwrtrx8gd65b
QA target: nexus-forge1/no-dispatch, qa-only
Run: https://github.com/nexus-forge1/no-dispatch/actions/runs/38975178673
QA commit: 23b49c775e0b8b516b926224caba8d20d5213242

## Defects found and repaired

1. Research saved truncated provider JSON as prose with zero citations. Complete JSON and at least one retrieved-dossier citation are now required before saving. Output is constrained to a short response with a larger completion budget. Legacy uncited records remain visible but do not complete shared research progress. Actual retry saved two W3C tutorial URLs.
2. Generated bakery artifact lacked labels and had a click handler that bypassed form validity. Verification correctly failed. The UI told the user to revise but offered no revision editor. New owner-checked revision mutation and editor preserve the original and save a separate draft requiring fresh verification and approval. The repaired artifact was saved through the actual editor.

## Actual artifact browser observations

Exact revision HTML was opened in Chromium.
- Empty submission rejected; confirmation remained hidden.
- Invalid email rejected; confirmation remained hidden.
- Valid fictional input displayed: Demo completed locally. No message was sent.
- Fields cleared after valid submission.
- At 375 x 812, no horizontal overflow.
The revised artifact includes labels, illustrative menu and hours, semantic navigation and no external form requests. The original failed artifact remains retained.

## QA delivery failure

The app committed the exact revision and dispatched the QA-only workflow. Job 117222791782 passed checkout, dependency installation, delivered-artifact validation, platform build and nine QA-repository tests. Persist successful build/test result to Convex failed with HTTP 500 at 22:21:14 UTC. The failure-report job also failed, leaving the app at dispatched state.

The workflow uses secrets.CONVEX_SITE_URL and secrets.NEXUS_FORGE_DELIVERY_SECRET rather than an explicit dispatch environment. This run originated in Testing. A destination mismatch is the leading diagnosis, not a proven secret value: GitHub masks the URL, and the connector cannot read or update Actions secrets. Do not blindly replay callbacks, change delivery records, or claim deployment. Next resolve QA callback routing/credentials for the originating environment, add observable failed-dispatch reconciliation/retry, then rerun through deployment/readiness/outcome verification.

## Verification and scope

502 tests across 89 files passed after the source repairs. Strict TypeScript validation passed; standalone CSS checker unavailable for Tailwind v4. Both additive backend changes deployed to Managed Testing with backward-compatible public contracts. Core fixes synced to main project commit 89836efd36fc0d6a87decf4dc8be61008403e975.

The initial mobile mission-link click was obstructed during automated interaction. Desktop continuation succeeded; its cause was not established, so no mobile navigation fix or pass is claimed for that interaction.

All test mutations were scoped to the reserved test owner in Testing. New mission, research, provider-use, artifact, revision, approval, audit and delivery records remain as evidence. The QA repository received only the scoped artifact delivery path; no NEXUS FORGE main-project artifact overwrite occurred. Existing Live mission records were not imported or edited. This test does not establish representative customer/business outcomes or close operational production-signoff gates.
