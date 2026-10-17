# Held work resumption — 17 October 2026 UTC

The operator resumed previously held work. This report supersedes earlier operator-pause statements. The app remains live; full production-readiness sign-off remains partial because specific evidence and access dependencies remain.

## Completed in this batch

| Area | Observed result | Scope |
| --- | --- | --- |
| Fresh backup | Supported Live export transferred successfully, passed ZIP integrity, was retained privately and independently retrieved with matching size and SHA-256: 1,549,692 bytes, 65 tables, 2,011 documents | Fresh manual database capture; not proof of recurring success or full-service recovery |
| Scheduling | Daily backup resumed at its existing 03:00 America/New_York schedule. Monthly restore remains enabled; both tasks now use the transferred main repository | Next scheduled success remains unobserved; no duplicate tasks or automatic retention deletion |
| Payment reconciliation | Two isolated paid test receipts matched canonical paid payment/invoice records: $59 paid, $20 credit granted. Unpaid checkout had no receipt. Scheduled cancellation matched the canonical timestamp | Customer test payments; not real-money or AI-provider invoice reconciliation |
| Concurrent AI execution | Two simultaneous funded Manifest actions completed with three strategies each in 5,155 and 6,018 ms. Four real provider invocations succeeded and recorded usage | One reserved test operator, administrative identity; not multi-user session load |
| Actual client interruption | HTTP request aborted after server admission was observed pending. Both resulting provider steps completed with recorded usage and no remaining holds or unresolved review | Client disconnect; server and provider continued. Not worker, provider-network or managed-host termination |
| Metering | Six total inference operations settled once at one cent each; isolated test account retained $19.94, with no held or unresolved funds | Versioned standard-model token rates; actual provider invoice charges remain unknown |
| Cloud read workload | Four paced owner-scoped workers: 224 successful billing/usage/mission/blueprint reads over 30,281 ms, zero failures, p95 53 ms, maximum 160 ms | Administrative identity; not login load, saturation or an agreed SLA |
| Live routes | 44/44 public-shell observations passed; p95 174 ms. Anonymous mission access denied | Read-only probes before this evidence-only publication |
| Regression | 540 tests across 98 files passed in 97.44 seconds | Includes current billing, recovery, isolation and continuation fixtures; controlled tests do not replace host-failure acceptance |

Tested source baseline: main repository commit 14e5cbcf424657d7347035d4b75324da85ef527c. This publication changes status/evidence text only.

## Data preservation and restore boundary

Before mutation testing, Testing was exported and verified: 66 tables / 2,282 documents. A second private recovery point preserves the current state after the drills: 66 tables / 2,312 documents, 1,621,195 bytes. All original documents remain present. The only changed original document is the isolated test operator's billing account; 30 new rows are six billing holds, six provider invocations and eighteen memories, all owned by that same test identity. No unexpected owner changes were found. These records remain as acceptance evidence.

The proposed drill would replace only Testing with the independently retrieved fresh Live backup, verify table/document hashes and relationships, then return Testing to its preserved current-state snapshot. Automatic approval review rejected the concrete overwrite because it replaces all current Testing data and the product warns it cannot be undone. The import was canceled. No import or alternate overwrite path was attempted. Specific approval for this Testing replacement-and-return is required before continuation; verify isolation again and take a fresh safety export if Testing has changed. Live was never imported over.

The source and private recovery files are preserved. Do not put snapshots, authentication records, customer identities, payment identifiers or access URLs in GitHub.

## Remaining dependencies

| Work | Exact next dependency |
| --- | --- |
| Fresh isolated restore | Specific approval for Testing replacement and return to its preserved state; automatic review blocked this action |
| Recurring backup acceptance | Observe a future successful scheduled capture/retrieval; assess freshness and reviewed retention. Manual success does not prove 24-hour RPO or four-hour service RTO |
| Real customer payments | Business/payout verification and mode activation in Macaly's Payments tab; test credit still cannot fund production inference |
| Actual AI cost reconciliation | Provider billing records for the same usage period. Token-based standard-rate estimates are not invoices |
| Production workload certification | Representative concurrent users, mission frequency, latency/error/cost targets, rate-limit behavior and longer measured execution workloads |
| Managed-host/provider-failure recovery | Supported host-fault controls or a separately prepared isolated fault environment. No managed-host termination control is exposed |
| Enterprise and product validation | Actual organization sign-in, selected identity-directory integration, connected product task events and representative comparable outcome periods |
| Independent research claims | Independent evaluators, frozen unseen tasks and actual replication evidence |

Mistral/Hugging Face remain set aside under the existing routing decision. Multimodal Studio remains removed; resuming held acceptance work does not restore retired functionality. Shared-seat billing, SCIM, broader service integrations and scientific claims are unfinished expansions, not completed by these drills.

## Next build priority

Complete the approved isolated restore-and-return, observe the resumed daily capture, then reconcile actual provider billing and define the representative execution workload. Preserve the existing sixteen-page guided workflow and dedicated feature pages.
