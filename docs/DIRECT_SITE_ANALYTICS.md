# Direct managed site analytics evidence — 2026-10-14

Portfolio Intelligence now retrieves aggregate website traffic directly from the existing Macaly analytics connection. This first supported direct source is the NEXUS FORGE live domain: bphntw8kdojl9qvuifywyjtk.macaly.app.

## Guided use

1. Select an owned mission as review context.
2. In Portfolio Intelligence → Direct Site Traffic Evidence, choose a completed observation period of at most 90 days.
3. Acknowledge that these are site-wide NEXUS FORGE counts, not mission-attributed product results.
4. Retrieve & save site traffic evidence. Inspect visitors, visits, pageviews, source, period, retrieval time, exact provider JSON and SHA-256 digest.
5. Browse private receipt history with pagination, then continue to Learning for evidence review.

Date inputs use the operator's local time; stored periods use epoch milliseconds. A mission link is review context only. Visitors are not authenticated active users, paying customers, revenue or task success. Counts cover the entire fixed NEXUS website, not an arbitrary product URL. Traffic receipts are kept out of productOutcomes, measurements and strategy-reuse comparison inputs.

## Direct source and runtime connection

The deployed internal action uses managed MACALY_BASE_URL / MACALY_CHAT_ID / MACALY_API_TOKEN to request get-dashboard-data-v2 at the platform analytics endpoint. The chat/domain are fixed to this project. It rejects a mismatched site, missing required counts, invalid values, redirects, oversized responses and invalid/incomplete periods. The response body is bounded to 32 KiB and the request has a 20-second limit. Missing metrics never become zero; provider-returned zero counts remain zero.

The public retrieval action first validates owned-mission access and explicit site-wide scope acknowledgement. Only trusted internal actions/mutations read provider data and save snapshots. Managed credentials never reach browser code or receipts. A runtime 403 can require the platform's reapply-convex-env repair; no separate analytics account or new user-entered key is needed for this supported site.

## Evidence history and boundaries

Owner-private siteTrafficReceipts retain mission review context, site, period, provider counts, exact raw dashboard response, SHA-256 and retrieval time. Identical owner/mission/period/response saves reuse their original receipt. Changed responses remain separate immutable snapshots. Queries paginate owner-scoped history.

Provider totals, counting rules, bot filtering, attribution and later corrections still apply. A successful lookup establishes provider-reported site traffic at a point in time, not independent causal validation, product adoption or business success. No mission approval/completion, delivery or strategy promotion changes.

## Real runtime validation

The deployed backend was queried read-only for 2026-10-07T00:00:00Z through 2026-10-14T00:00:00Z. It returned **52 visitors, 66 visits and 219 pageviews** for the exact live domain. Retained response SHA-256: 21d4f43058abd7961e3d6a432f0dd9dc53b1df36bb709f046e1ee5916e657eeb.

This verifies the real production managed connection and source parser. The diagnostic did not create a mission receipt or fabricate a product result. Operator save behavior is separately covered with controlled tests.

Regression cases cover authenticated/private scope, explicit acknowledgement before network access, zero-versus-missing handling, domain validation, finite/integral counts, bounded periods/responses, provider errors, immutable deduplication, changed snapshots, pagination and preserved UI drafts.

Next: source-specific integrations for other deployed products, repeated comparable real outcomes and actual Council retrieval evaluation. All 16 feature pages remain in the guide.
