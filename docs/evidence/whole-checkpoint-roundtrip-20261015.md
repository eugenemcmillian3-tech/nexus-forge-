# Whole-checkpoint restore/return — 2026-10-15 UTC

Result: PASS for the supported platform checkpoint restore mechanism and exact current-source return in Testing. Full production-readiness sign-off remains HOLD. No historical candidate was published and Live was not rolled back.

## Authorization and actual platform action

The operator replied Proceed to the specific request to restore the 12:14 AM America/New_York run checkpoint, test it in Testing, and return current code, with the later-chat-history removal explicitly disclosed. On 2026-10-15 the Restore button in the selected checkpoint confirmation was applied. The dialog closed, later chat entries disappeared, the selected completed run remained and the preview rebuilt. This was an actual supported UI restore, not a module file substitution.

The source returned by the UI was independently inspected. Actual restore commit 37c8828b11f84129658e81e4a8acd52bd5d45673, tree d7125dafdf068b88ea2b9d0ff855690feca4dc83, timestamp 06:59:11 UTC. Its tracked source exactly matched candidate 32d6a9a65e7cf41d8440b65bfe76e0edec511e64 (zero full-tree diff), confirming the earlier timestamp correlation after the fact.

## Scope and restored-checkpoint validation

Before the drill, current source was preserved at ee845ef67cdc3143570d3077da32d22fde1b278e, tree e67adeb86ee198b74f0dd085078f4a1503de54dc. It remained available throughout the exercise and was already represented in the platform Git history and synced GitHub evidence baseline.

The actual checkpoint differs from that preserved baseline in only four evidence/readiness paths. The full convex directory has zero diff. It retains provider result recovery and execution claims, unlike incompatible older pre-accounting/pre-claim versions. Thus this is a whole-source platform restore across an evidence-text revision, not a backend feature/schema migration rollback.

Macaly independently confirmed sandbox Testing quick-rabbit-810 and publish Live tame-rat-826 before and after restoration. Restored preview build succeeded. The managed deployment command deployed only to Testing and reported public-contract backward compatibility. Strict validation passed. All 35 selected recovery/workflow tests passed: 12 execution-claim tests, 13 provider-accounting tests, five production-release tests and five sixteen-page workflow tests.

## Return to current source

Returned the four changed paths to their exact preserved contents through the supported Git file-restore workflow and committed the return. Return commit 92081cac2c897d8914bc0eafe71186934de2413c, tree e67adeb86ee198b74f0dd085078f4a1503de54dc, timestamp 07:00:55 UTC. The tree is identical to the preserved pre-drill tree, and the full tracked-source comparison was empty. Later documentation of this drill is an intentional subsequent change.

Managed Testing deployment again reported backward-compatible contracts, and the same 35 tests passed again. The observed source restore-to-return commit interval was 104 seconds; it excludes subsequent record verification and is not a full-service RTO or an outage measurement. Historical chat entries removed by the approved UI action were not reconstructed; source recovery does not imply chat-history recovery.

## Data and service checks

At 07:02:08 UTC, compared counts and canonical record hashes for all 13 inspected Testing tables against the preserved post-managed-claim-drill receipt: every table matched. Counts included missions 51, missionRuns 15, agentRuns 210, evidence 362, memories 121, deliveries 20, providerInvocations 1, incidents 5 and auditEvents 334. Council selection receipts, providerResults, executionClaims and executionEffects were empty and unchanged.

No database import, mission execution, live provider inference, delivery or external dispatch occurred during this round trip. Testing and Live identities remained separate, and Live remained READY. The original live deployment was not deliberately replaced with historical code.

## Release limits and next work

Supported whole-checkpoint UI restoration and exact source return now have bounded evidence. The empty Version History list is no longer a blanket restore blocker; completed run cards are usable after ending the editor claim. A backend-changing whole-release rollback, actual Live recovery, managed-host interruption, real-provider interruption and full-service recovery targets remain unverified. Rollback remains PARTIAL for those broader requirements; do not repeat the completed evidence-text checkpoint rehearsal without a relevant change.
