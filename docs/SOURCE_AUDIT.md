# NEXUS FORGE source parity audit — 2026-10-14

Scope: compare tracked files under `src/`, `convex/`, and `__tests__/`, excluding stock `src/components/ui/` primitives. This is a source-difference audit, not a claim that every roadmap capability is finished or that every workload has been validated.

Baseline GitHub main: `9c0fb372fd0bb5a11756d07daa1c60209fda2499` (PR #120).
At the start, 115 Macaly files in scope were compared: 97 identical and 18 different. No Macaly source files in this scope were missing from GitHub. GitHub additionally contained four tests and a generated Macaly integration helper.

## Confirmed gaps repaired in PR #121

| Area | Change |
| --- | --- |
| Runner delivery lookup | Internal lookup no longer requires browser identity. Public history remains owner checked. |
| Dispatch preflight | GitHub now has the live repository/branch access checks before artifact upload or dispatch, with recorded failure evidence. |
| Destination identity | Both preparation paths reuse only records matching mission, artifact, normalized repository, and branch. A changed destination creates a separate request. |
| Callback evidence | Preserve bounded summaries and canonical URL parsing alongside immutable callback receipts and explicit readiness counts. |
| Dispatch repository | Keep `eugenemcmillian3-tech/nexus-forge-` as the platform project and `nexus-forge1/no-dispatch` as the separate dispatch target. Remove the obsolete hard-coded QA repository name; explicit configured allowlists remain supported. |
| Council handoff | Continue to Research & Memory, and send missing-mission/approval guidance to Mission Console. Partial planning memory uses 0.5 confidence; completed planning uses 0.9. |
| Shared shell | Restore GitHub's missing sign-out control and shared live styling. Sign-out failures preserve selected mission and restore the button. Selection footer follows mission changes. |
| Root and metadata | Retain MacalyBridge, align root authentication and social metadata, and preserve all route metadata entries. |
| Intent parsing | Retain JSON syntax repair followed by existing field, bounds, and strategy validation. |
| Readiness | Explain that both workflow and readiness evidence timestamps must be fresh. |
| Typed worker API | Register researchData in GitHub's API declaration for actual worker handoffs. |
| CI | Add direct TypeScript checking of application and tests before tests/build. |
| Test coverage | Preserve live research persistence and intent-repair coverage, plus ten new delivery/UI regressions. |

Network regression tests mock GitHub responses; they do not perform real external dispatch.

## Retained differences and why

| Files | Classification and disposition |
| --- | --- |
| `convex/_generated/api.d.ts` | Generated module inventory differs. Macaly includes helper-only modules and legacy researchData public compatibility exports; GitHub includes its platform helper. Actual worker researchData and provider-health APIs are registered. Do not replace environment-specific generated inventories wholesale. |
| `convex/_generated/server.d.ts`, `server.js` | SDK-generated Macaly variant exports an environment helper; GitHub's older generated variant does not. Application code does not import that helper. |
| `convex/tsconfig.json` | Equivalent compiler options with different formatting. |
| `convex/researchData.ts` | Macaly retains owner-checked public save/list compatibility exports. Current UI uses `research.ts`; workers use the identical internal listForSynthesisInternal function. No current workflow depends on these extra public aliases. Retain rather than add unused endpoints or remove compatibility without a migration need. |
| `__tests__/app/page.test.tsx` | Live source has fuller mocked sign-in form tests; GitHub has a smoke test. This is test coverage variance, not a live authentication requirement. |
| `__tests__/ownership-isolation.test.ts` | Each source has additional ownership cases. Preserve both; shared runtime APIs are aligned and new delivery/review tests verify the touched boundaries. |
| `__tests__/research-origin-safety.test.ts` | GitHub tests more unsafe origin examples; retain that coverage. Both use the same research implementation. |
| GitHub-only `convex/macaly.ts` | Generated platform integration helper; do not copy it into the live app or delete it as a parity exercise. |
| GitHub-only artifact-approval, delivery, learning-engine, research-synthesis tests | Retain these additional tests. Their absence in Macaly does not represent a missing runtime module. |

No unresolved user-facing behavior gap was identified in the retained differences above. This does not certify unrelated code or complete the 24-milestone roadmap.

## Next priority

Review remaining feature functions and components, then validate integrated artifact functionality and delivery against saved evidence. Preserve previously accepted Research, Manifest, and LocalBoost receipts; do not repeat authentication/approval exercises as a routine maintenance gate. Broader capability benchmarks, real product/business outcome ingestion, long-horizon reliability, and deferred roadmap expansions remain separate work.
