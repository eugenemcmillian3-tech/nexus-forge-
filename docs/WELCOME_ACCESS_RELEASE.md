# Welcome and account access upgrade — October 16, 2026

## Experience

A responsive public welcome screen introduces NEXUS FORGE with a branded introduction and a simple plan/build/verify product overview. The account panel provides distinct Sign in and Create account choices. Both use the existing email-code provider: an existing verified email signs into its existing account.

The code screen includes numeric input, one-time-code autofill, keyboard focus recovery, clear errors, a resend button with a 30-second client cooldown, and an option to change the email. Duplicate in-flight requests are blocked locally. Server authentication and rate limits remain authoritative.

Configured Google Workspace sign-in remains available through the existing provider. No organization login or external tenant acceptance is claimed by this UI release.

Session loading now uses a branded accessible status. Styles are scoped to the welcome/loading surfaces. No root routing, mission guide, governance, provider credentials or backend authentication implementation changed. Multimodal Studio remains removed.

## Comparison

| Previous | Updated |
|---|---|
| Minimal sign-in form with little product context | Branded welcome with focused account panel |
| New users entered through an unlabeled shared flow | Explicit Create account choice explains verification and existing-account behavior |
| Code screen offered only verification or changing email | Code screen adds controlled resend, focus recovery and clearer errors |
| Unstyled connection text | Branded session-check state |

## Validation

Five focused UI checks cover signup semantics, exact provider arguments, code errors, duplicate request prevention, resend cooldown and Workspace error recovery.

A reserved-email OTP browser session verified real account creation, a real resent code, successful entry into the workspace, reload persistence, sign-out and returning-account sign-in. Both sign-ins reused exactly one new user and one authentication account. Desktop and mobile layout were inspected; mobile had no horizontal overflow.

All original Testing records were unchanged before cleanup. Testing returned to 2,032 documents across 60 table exports with matching canonical hashes and counts. Live data was not imported or replaced.

Final full regression, strict validation and live checks accompany the release.
