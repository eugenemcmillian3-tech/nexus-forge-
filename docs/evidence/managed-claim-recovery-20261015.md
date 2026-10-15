# Managed Testing claim recovery — 2026-10-15T05:51:59Z

Decision: PASS for managed transactional admission and persisted-state simulation. Integrated recovery remains PARTIAL; full production-readiness sign-off remains HOLD.

## Isolation and safety

Macaly independently confirmed sandbox Testing quick-rabbit-810 and publish Live tame-rat-826 before and after the drill. No other active editor or Macaly agent was reported. The managed deployment command deployed the current source to Testing and confirmed public-contract backward compatibility. The harness checked the selected Testing deployment in platform-managed configuration; it did not override credentials or use --prod.

Before writes, all executionClaims were confirmed empty. A Testing snapshot including file storage was exported: 1,537,369 bytes; SHA-256 e8fbe8ae010e0cc04caa8928cc1a3ded32ddcb40b2b566399be605f9028bef5f. This is a temporary safety snapshot in the Macaly sandbox, not a new durable private backup or scheduled-backup receipt.

The selected mission was already approved and complete. It was used only to bind claim metadata. No mission replay, inference, artifact generation, evidence/lesson write, delivery, external dispatch, production import or host interruption was requested.

## Deployed-function results

- Four concurrent CLI requests to executionClaims.acquire for the same mission/scope/work key produced one admitted worker and three running-contention rejections. These are overlapping client requests and managed transactional exclusion observations, not backend handler traces.
- The admitted claim was completed with a clearly controlled synthetic result. A delayed acquire returned that exact persisted result without creating a new claim. The result was drill metadata, not an AI answer or provider success.
- A separate Council-scope claim was explicitly marked uncertain to model persisted unconfirmed work. A different work key could not take over: acquire returned busy=uncertain.
- The admission/replay/uncertainty verification window was 8,201 ms. It is not a service recovery time or four-hour RTO measurement.
- Cleanup first checked that every claim row belonged to this drill, then restored only executionClaims to its original empty state through supported table replacement. No full-database or Live replacement was performed.
- Final checks matched both counts and canonical record hashes across all 13 inspected tables. Representative unchanged counts: missions 51, missionRuns 15, agentRuns 210, evidence 362, memories 121, deliveries 20, providerInvocations 1, incidents 5, auditEvents 334. Council selection receipts, providerResults, executionClaims and executionEffects remained empty after cleanup.

The initial read-only harness preflight encountered an empty CLI output for an empty table and stopped before snapshot creation or writes. The corrected harness treats that documented empty result as an empty array. The observations above are from the corrected completed drill.

## Limits and next work

This demonstrates the deployed database functions, persistence across separate CLI invocations, uncertain-work exclusion and exact return to the original inspected state. It does not simulate an actual crash, terminate a managed action, interrupt successful live inference, verify provider-side idempotency, recover an uncertain claim automatically, or measure full-service recovery.

The connector's recovery guide search exposed no supported managed-host stop/restart/termination control. Do not substitute a sandbox dev-server restart, a fabricated success record, or a database flag for a managed-host crash result.

Existing controlled Council/tick and provider tests remain valid for their recorded scope (389 tests / 64 files at the published engineering baseline). They were not rerun for this evidence-only drill. Next recovery requirements are a supported managed interruption path, reviewed uncertain-work recovery controls and stable stage-context snapshots. Remaining backup, whole-version rollback, capacity and provider-billing gates retain their existing statuses.
