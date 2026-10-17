# Payment checkout acceptance — 17 October 2026 UTC

## Real test-mode browser results

A fresh reserved test account started with zero balances and no paid receipts. All card entries used documented test numbers. No real charges were made.

| Flow | Observed result |
| --- | --- |
| Public pricing before sign-in | All seven paid offers visible; checkout still required authentication |
| Prepaid $10, declined card | Provider decline shown; prepaid and monthly balances stayed zero; no paid receipt |
| Prepaid $10, successful card | Embedded checkout completed; actual payment webhook granted exactly $10 prepaid credit and one invoice receipt |
| Core $49/month, declined card | Provider decline shown; prior $10 prepaid remained; monthly allowance stayed zero; no subscription receipt |
| Core $49/month, successful card | Actual paid-invoice webhook activated Core and granted exactly $10 monthly allowance; prepaid $10 remained; one additional invoice receipt |
| Browser reload | Both balances, active paid-period status and exactly two payment receipts persisted |
| Mobile billing | At 375px viewport width, document width was 375px with no horizontal overflow; all seven plan cards were present |
| Subscription management | Hosted account portal opened with the two matching test invoices and Core subscription |
| Test renewal cancellation | Portal confirmed service ends November 17, 2026; app displayed the provider-confirmed scheduled cancellation date while preserving the paid period |

These are real test-processor/card-form/webhook observations, separate from controlled unit fixtures. They are not revenue, customer adoption, or real-money acceptance evidence.

## Confirmed issues fixed

- The global authentication wrapper initially hid the intended public pricing route. An exact-path exception now exposes pricing while protecting checkout, billing and other application routes.
- Automatic currency conversion initially offered EUR while fulfillment required USD. Checkout now disables adaptive conversion and matches the published USD contract.
- The provider scheduled cancellation using cancel_at with cancel_at_period_end=false. Both cancellation forms are now normalized and the actual end date is retained and shown. Opening subscription management also refreshes canonical status.
- Delayed prepaid settlement can reconcile through payment_intent.succeeded as well as checkout completion. Both use the same immutable session-keyed grant. A settlement not yet visible on the canonical session requests a retry instead of acknowledging a lost fulfillment.
- A refund that precedes account creation now creates a mode-isolated customer hold. Fulfillment and subsequent checkout reject the hold pending review, including when no billing account exists yet.

## Verification

Full regression passed 539 tests across 98 files. After the final pre-checkout refund guard, the focused billing, checkout-event and route-access run passed 23 tests across three files. The focused tests cover USD amounts, recurring versus prepaid checkout configuration, public-route boundaries, delayed settlement/retries, duplicate notifications, scheduled cancellation and refund ordering. Managed Testing deployment reported the public contract backward-compatible. Final TypeScript status is reported with the release.

Controlled delayed-payment and refund-ordering cases supplement the real successful/declined card journeys; no claim is made that a bank settlement or actual refund was performed in the browser.

## Cleanup and activation

The test subscription's future renewal was canceled. The remaining abandoned unpaid checkout from this test account was expired. Paid test receipts and their mode-tagged audit history were retained. Payment mutations were limited to the isolated test identity and its test payment objects.

The current app payment mode remains test. The current test account reported charging disabled, payouts disabled and business details not submitted. Complete business/payout activation through Macaly's Payments tab, switch to Live and republish to enable real charging. Production AI continues rejecting test credit. Shared team-seat billing, real-money acceptance, renewal/SCA acceptance and broader production reconciliation remain outside this test closure.
