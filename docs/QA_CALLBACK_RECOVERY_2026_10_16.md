# QA callback recovery — October 16, 2026

## Status
PARTIAL / EXTERNAL WORKFLOW WRITE BLOCKED.
Existing Testing mission k9716ne11cckst498bdnnq201h8gdp1c and delivery ks713gsmma2nhrak8f5vhwrtrx8gd65b are retained. Failed run: https://github.com/nexus-forge1/no-dispatch/actions/runs/38975178673.

## Implemented
- QA-only dispatch can include the originating server-managed CONVEX_SITE_URL as callback_origin. Other branches/targets retain their existing input contract.
- Before QA artifact upload or retry authorization, the server verifies that the QA workflow declares and uses callback_origin. Missing support stops before writes.
- User recovery verifies the latest completed failed/cancelled/timed-out GitHub run, exact QA branch, workflow path, workflow_dispatch event and delivery commit message.
- Recovery cannot modify target, artifact, approval or existing callback evidence. Atomic state checks limit it to unresolved dispatched QA deliveries. Retry dispatch remains a separate action.
- Expected missing-workflow support returns a structured message visible to the user rather than generic Server Error.

## External blocker and prepared change
GitHub update_file for nexus-forge1/no-dispatch, qa-only, .github/workflows/nexus-forge-delivery.yml returned 403 Resource not accessible by integration. The workflow was NOT updated. No alternate credential was used to bypass that rejection.

The complete replacement is prepared in docs/qa-workflow/nexus-forge-delivery.yml in the main NEXUS FORGE repository. It adds optional callback_origin, retains the existing secret URL as the default, and allowlists only the known Testing/Live Convex HTTP origins before using the shared callback credential. Existing secret values are neither exposed nor changed.

Next apply the prepared file as .github/workflows/nexus-forge-delivery.yml on nexus-forge1/no-dispatch branch qa-only using an authorized workflow editor, or grant the connected integration permission to update that workflow. Then use Delivery Pipeline to verify failed run 38975178673 and explicitly dispatch the same approved delivery. Observe callback, deployment, readiness and outcome recording; none are claimed complete now.

## Validation
Ten targeted tests across four files passed: recovery origin/run constraints, actual missing-workflow preflight preserving the original delivery, other-owner denial, existing runtime checks and callback replay invariants.
Managed Testing accepted the backward-compatible backend. Actual signed-in browser recovery showed:
"QA workflow upgrade required ... GitHub integration denied workflow update (403). No retry or artifact upload attempted."
The delivery remained dispatched with no new GitHub artifact upload, run or callback fabricated during recovery review.
