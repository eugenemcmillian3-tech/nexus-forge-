# NEXUS FORGE current status — October 16, 2026

The platform remains live at https://www.network-x-ai.com. Main project: eugenemcmillian3-tech/nexus-forge-. The separate nexus-forge1/no-dispatch repository is dispatch QA only.

## Latest resource-capacity release

- Security & Resilience now shows owner-private saved-record counts, enforced limits, remaining admission slots and reached-limit states for nine collections.
- Counts are bounded. Above a limit, the view says "at least" rather than claiming an exhaustive count.
- Historical multimodal, Gemini-media and media-chain receipts are excluded from active runtime admission and current developer receipts. Existing owner-only history is retained unchanged.
- New retired-media receipt admission is rejected. Active pending/failed replay protections, immutable request keys and transactional quota enforcement remain in force.
- Configurable admission limits and fixed feed/source limits are distinguished. Retired package versions, closed protocols and disabled feeds/sources still count where their existing admission policies require.
- Record counts are not provider quota, compute, traffic, storage or billing evidence.

Sixteen targeted capacity, retirement, runtime and UI checks passed. Managed Testing deployment accepted the compatible backend. Reserved-email OTP browser acceptance verified initial counts, a new saved policy, reactive limits, reload persistence and mobile containment. All 2,030 original Testing documents across 60 table exports matched their canonical hashes after cleanup. No Live data import occurred.

| Previous behavior | Current behavior |
|---|---|
| Retained media receipts could consume active runtime quota | Active runtime admission excludes all three retired media categories |
| Current tool receipts included media history | Current tool view reads active receipts; legacy owner-only history remains available |
| Admission limit had no current usage view | Nine private collection counts expose capacity and their exact scope |

## Earlier directory and telemetry release

- Admin-only directory roster preview and atomic apply on Team Governance.
- Exact roster, actor, directory, verification and membership fingerprint. Stale reviews fail without partial changes.
- Missing grants are retained by default. Explicit omission removal affects directory-managed grants only.
- Team owner and reviewing admin remain protected; manually created memberships remain intact.
- Reassigned verified directory identities revoke the previous linked membership.
- Existing provisioning API request/return contracts remain compatible.
- Server product-event client validates bounded JSON acknowledgments, retains stable event IDs, aborts stalled requests and redacts upstream errors. It never retries automatically.
- Multimodal Studio stays removed. Original 16-page guide and six expansion pages are unchanged.

## Comparison with the previous release

| Before | After |
|---|---|
| Grants added or revoked individually | Complete bounded roster reviewed and reconciled in one transaction |
| Admin could act from a stale roster view | Apply requires the exact reviewed state |
| A changed account link could leave the prior membership active | Old linked membership is revoked on verified reassignment |
| Client accepted any successful JSON response | Client requires a bounded event acknowledgment and reports uncertainty honestly |

## Evidence

Nineteen targeted directory, identity, UI and client checks passed. Testing deployment accepted the backward-compatible backend. A reserved-email OTP browser flow created a unique team, reviewed and applied one pending grant, reloaded and reopened it, then reviewed and applied its revocation. No invitation was sent.

Before cleanup, all original records were unchanged and every new record was linked to the isolated test identity. Testing was restored to 2,026 documents across 60 table exports with every canonical document hash and count matching the baseline, zero storage files. Live was not imported or replaced.

Full regression, strict checks and production probe results are reported with the release.

## What still requires external evidence or a separately scoped integration

| Item | Exact dependency |
|---|---|
| Real Workspace SSO acceptance | An actual organization user must sign in and satisfy the configured verified hosted-domain claim. Callback preflight is already working. |
| Automated identity-directory synchronization | Select the actual IdP/directory, access model and deprovisioning scope. This release reconciles operator-supplied rosters; it is not SCIM or an external directory connector. |
| Additional authenticated services | Name the service and permitted operations; connect its account. GitHub data writes already exist. No arbitrary service credentials are requested. |
| Product improvement | Connect the existing telemetry client to actual completed product tasks and collect representative comparable periods. Synthetic tasks do not establish customer outcomes. |
| Independent/scientific/unseen-task validation | Independent evaluators, frozen representative task sets and actual evidence are required. Passing public software fixtures is not independent certification. |
| Full active-capability production acceptance | Requires the relevant organization and product evidence above; the earlier LocalBoost core E2E remains accepted historical evidence. |

## On hold

Billing reconciliation, scheduled-backup acceptance, production workload certification and actual provider/host-failure acceptance remain on hold. Ordinary publishing and scoped Testing verification continue.

## Removed scope

Multimodal Studio and its image/music/video provider acceptance are removed at the owner's request. Do not reintroduce them without an explicit new request. Their quotas do not block active project progress.
