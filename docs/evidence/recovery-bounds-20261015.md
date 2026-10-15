# Recovery bounds and backup transfer correction — 2026-10-15

## Delivered

Recovery admission no longer reads an entire growing mission history. Additive compound indexes cover claim status, exact work identity, exact effect identity and runner/provider stage identity. Active claim lookups use first(); cached identities retain duplicate rejection through unique(); provider reservation reads at most two matching invocations and rejects any ambiguity. Pending legacy invocations remain visible. The owner-scoped unresolved view reads active statuses only and fails visibly beyond 100 rows per status rather than silently hiding locks. No public arguments/results were removed and no records were deleted.

Three accumulated-history regressions cover 250 older claims/invocations, uncertain work overriding cached success, independent scopes/stages and ambiguous completed identities. All 28 focused recovery/accounting tests passed; the full suite passed 392 tests in 65 files. Managed Testing deployment reports a backward-compatible public contract.

The existing daily backup automation was updated in place: register download listener before export, await that exact download, resolve its supported shared path and require nonzero actual bytes before private saving. It retains prior recovery points and reports failed transfers explicitly. The schedule and monthly restore task remain unchanged. This prompt correction is not proof of a subsequent successful scheduled run.

## Remaining operational acceptance

The consolidated release-closeout-20261015.md remains authoritative for unverified real inference interruption/managed-host recovery, fresh-capture restore and recurring success, backend-changing whole-release rollback, agreed representative load limits and provider billing reconciliation. Stable context snapshots and reviewed uncertain-work recovery controls still require implementation and validation. No automatic claim expiry or unsafe reset was added. This batch improves bounded admission; it does not close every recovery handoff or imply full production acceptance.
