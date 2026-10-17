# NEXUS FORGE platform task measurement — 17 October 2026 UTC

## Completed

Portfolio Intelligence now summarizes owner-private platform task outcomes from the existing backend paths. No new workspace or external credential is required. Platform measurements are separate from productOutcomes and never approve, complete or dispatch a mission.

| Task | Recorded success | Timing |
| --- | --- | --- |
| Research search | The authenticated search operation saves a result with retrieved citations | After ownership/input validation through saved result, including retrieval/provider work |
| Artifact generation | Generated content passes existing structural checks after the bounded correction attempt | Internal generation start through persisted draft and quality result, including correction |
| Delivery | Existing provenance-validated deployment callback passes its workflow, commit and readiness checks | Delivery preparation through callback; includes approval and workflow waits |

Research/provider exceptions record failed attempts. A generated draft that fails structural checks is a failed quality outcome even though the draft is saved. A failed workflow callback records a failed delivery. Build/test success alone does not count as a successful deployment.

Confirmed dispatch creates a pending delivery measurement. Interrupted research/generation or a missing deployment callback can remain pending. Pending results are unresolved and excluded from terminal success-rate and completed elapsed-time denominators; their counts remain visible. Dispatch preflight failures are outside this delivery measure. Structural checks do not establish browser correctness, and saved citations do not independently establish research truth.

## Scope and privacy

The query returns the latest 100 recorded attempts by record creation, with an explicit truncation flag if older records exist. It supports the selected owned mission or all owned missions and reports counts, terminal success rate, mean elapsed seconds and timed sample counts by task type. Empty results say not measured. There is no historical backfill and no automatic claim of causal improvement, customer adoption or revenue.

Only internal backend operations write results. Authenticated queries enforce owner access. Measurements retain mission association and bounded source references, not prompts, generated content, provider error messages or credentials. Terminal task results are immutable; repeated validated delivery callbacks do not inflate counts. No synthetic measurement events were inserted into Live by this release.

Existing artifact revisions and manual re-verification are not new generation attempts. Research synthesis and other uninstrumented research paths are outside the search metric. Provider/model fallback within one operation remains part of one task. No sample represents an independently frozen benchmark or a representative customer cohort.

## Verification

- Full regression: 517 tests across 95 files passed.
- Added lifecycle tests cover owner and anonymous access, pending denominators, elapsed time, immutable results, bounded samples, validated delivery callbacks and replay behavior.
- Existing research persistence tests now verify successful cited research and failed citation validation measurements.
- Existing artifact generation/correction test verifies one failed structural-quality measurement across regeneration.
- UI tests distinguish loading, missing data, zero success, sample limits and unresolved work.
- Managed Testing deployment accepted the additive backend and reported the public contract backward-compatible.
- TypeScript passed. The standalone CSS checker was unavailable.

## Next

Use the normal research, artifact and delivery workflow to collect actual task observations. Review adequate comparable samples before making improvement claims. External product telemetry remains available for real customer task data, separately from this platform performance view. Existing held operational acceptance gates remain unchanged.
