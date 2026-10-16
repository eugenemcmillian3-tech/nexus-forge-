# Remaining engineering batch — October 15, 2026

This batch closes three implementation gaps while preserving the original 16-page guide and 23 routes. It does not complete every broader research, media or operational milestone.

## What changed

| Area | Implemented | External acceptance |
|---|---|---|
| Enterprise identity | Optional Google Workspace OIDC, verified email plus exact hosted-domain claim checks, configuration readiness query and sign-in control. Existing OTP remains available. | Disabled until tenant/client credentials and a hosted domain are configured. Actual IdP login is not claimed. |
| Provisioning | Admin-only explicit grants for up to 20 verified emails per team, viewer/contributor roles, pending grants for future verified sign-in and deprovisioning. Owner protection, audit and existing membership limits remain. | Deployed pending/revoke checks passed. Verified-user application and revoked-user isolation passed controlled integration tests. This is not SCIM. |
| Authenticated writes | Exact immutable mission-bound GitHub plans for up to ten JSON/Markdown/text/CSV files under agent-output/. New nexus-agent branch only; approved mission, owner and incident clearance; authorization rechecked before branch creation. No main update, automatic merge or requested workflow dispatch. | One real data write passed and its exact branch/commit was independently read back. Existing repository CI rules may run. Other write services are not implemented. |
| Product instrumentation | Server-side source tokens stored only as SHA-256 hashes, rotation/revocation, bounded HTTP events, exact event IDs and immutable replay checks. Every ten unique task events produces a server-derived mission outcome at a fixed 80% target. | Thirty controlled deployed HTTP events produced three 9/10 = 90% outcomes. Disabled source rejected further ingestion. These are acceptance events, not customer/product improvement evidence. |
| Adaptive planning | Source-specific event batches can inform the same bounded planning policy as imported reports. Exact metric/target/method, sample minimum and nonoverlapping periods remain required. | Three controlled periods selected reuse-with-verification; a failing period returns evidence-first in tests. Causal improvement is not established. |
| Compatibility | Existing verification:productOutcomes preserves its two legacy provenance variants and filters telemetry. New productOutcomesV2 includes product-events and is used by the current outcomes/reuse UI. | Managed deploy accepted the final backward-compatible contract. Old and new endpoint behavior is tested. |

Deployed details: [enterprise-write-telemetry-20261015.json](evidence/enterprise-write-telemetry-20261015.json).

The real write used branch nexus-agent/rs74a3nrjwm2praagv0kdk0hc58gbhes, commit 55777d321a7c9848d9a10ed766ce54ba1d2f4102. Only agent-output/remaining-gap-acceptance.txt was changed. The branch is retained as acceptance evidence; main stayed at its original head during the drill.

## Workspace SSO activation

Configure AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET and AUTH_GOOGLE_HOSTED_DOMAIN on the appropriate server deployment using the organization's Google Workspace OAuth client. Register the deployment's exact /api/auth/callback/google URL on its Convex site origin. Keep credentials server-side. Testing and Live need their respective callback URLs.

The provider is not registered unless all three values are valid. The hosted-domain request hint is not treated as proof: the verified profile must contain email_verified=true, matching hd and matching email domain. Arbitrary email-suffix assertions are rejected. Explicit team grants remain separate from authentication; domain membership never grants team access by itself.

Update, October 16 UTC: the configured URL was normalized to its exact hostname without guessing another tenant. Testing now reports Workspace SSO configuration-ready. Actual organization-user IdP sign-in must still confirm that the configured hostname matches the Workspace hosted-domain claim. Website verification is separate from tenant ownership. Live readiness is checked after publishing. No secrets were requested or exposed. SAML, SCIM and multi-tenant enterprise configuration are not implemented.

## Product integration

Create a source in Portfolio Intelligence for an owned mission. Its token is returned once; saved lists expose neither the value nor hash. Keep it on the product server. Use scripts/product-event-client.mjs with these server environment variables:

- NEXUS_PRODUCT_EVENTS_ENDPOINT: exact HTTPS Convex site /product-events URL.
- NEXUS_PRODUCT_SOURCE_ID: source ID from creation.
- NEXUS_PRODUCT_SOURCE_TOKEN: source token.

Call recordTaskOutcome({eventKey, success}) after an actual completed task. The key must be a stable opaque task identifier (8–100 letters/numbers/underscore/hyphen). Reconcile an uncertain response using the same key. Identical replay is idempotent; conflicting payloads are rejected.

Limits: 20 sources per operator, 1,000 events per source, 8 KiB HTTP body and ten unique events per measurement batch. Disable or rotate a source from its owner controls. Source-authenticated observations establish origin, not independent truth. Do not report synthetic acceptance tasks as customer outcomes.

## Write behavior

Preparation is read-only at GitHub and saves the exact base commit/tree and contents. Execution publishes a new branch only. Main, workflow files, scripts, executable paths and traversal paths cannot be targeted by this tool. Credentials are never sent to user-supplied endpoints. Pending, uncertain and revoked plans cannot retry automatically. A completed plan returns its existing receipt. Inspect an uncertain exact remote branch before preparing a replacement; already transmitted data cannot be recalled by later revocation.

## Validation and data return

469 tests across 79 files passed. Managed Testing deployment accepted the backward-compatible API contract. The deployed controlled telemetry/directory/write drill passed. Testing returned to 2,009 original documents across 58 document-table exports, zero storage files, with every count and canonical document hash matching the pre-drill snapshot. The isolated GitHub acceptance branch remains as evidence. No production data experiment was performed.

## Latest browser acceptance

A reserved-email OTP browser session passed scoped recording and navigation checks across all seven expansion pages. See [SEVEN_BROWSER_ACCEPTANCE.md](SEVEN_BROWSER_ACCEPTANCE.md) for exact actions, synthetic-data limits and verified Testing restoration. This is separate from a full all-services venture mission or real Workspace sign-in.

## Remaining work

- Workspace tenant activation and real IdP sign-in validation.
- Broader enterprise directory synchronization and additional authenticated write-service integrations.
- Instrument actual products and collect sufficiently long representative outcome periods to assess improvement.
- Resolve the previously recorded image-generation provider rejection and evaluate perception quality on a labeled corpus.
- Gemini original-video analysis, image generation and 30-second music composition are now implemented. Native-video known-fixture acceptance passed; image and music real checks returned HTTP 429. See [Gemini integration evidence](GEMINI_MEDIA_BATCH.md).
- Independent competitor/scientific replication, unseen-task evaluation and a complete signed-in all-seven mission remain empirical acceptance work.
- Billing reconciliation, scheduled-backup acceptance, production workload certification and real provider/host-failure acceptance remain on hold.

The real-service report from the previous batch remains valid historical evidence, including media failures. It is not superseded by passing software tests.
