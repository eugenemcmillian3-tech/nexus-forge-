# Whole-version checkpoint restore preflight — 2026-10-15 UTC

Status: prepared; no checkpoint restore applied. Rollback gate remains PARTIAL. Live remained READY and was not restored or republished during this inspection.

## Current preserved baseline

Platform project bphntw8kdojl9qvuifywyjtk; sandbox Testing quick-rabbit-810, publish Live tame-rat-826. Functional baseline source HEAD f11ca70295607977e65d8f674b7e422c36f10cbf, tree 55623d9b25341176e0b284f2471f72349e71719a. Equivalent synced GitHub release/evidence baseline: eugenemcmillian3-tech/nexus-forge- commit 7b1a331e3c87deceac99327850b234d78006b574. No uncommitted application source changes were reported before this preparation.

## UI findings

Signed-in project UI independently showed Testing selected. Version History still displayed No previous versions yet. After ending the external editor claim with preview_app and refreshing, completed external-run cards exposed Restore previous version and Duplicate controls. The previous empty-history-list observation does not establish that all supported restore paths are unavailable.

Run cards visible in the project: 12:14:36 AM and 1:53:08 AM America/New_York on 2026-10-15. The 1:53 AM card's restore confirmation was opened only for inspection. Preflight completed and enabled Restore, with the warning that changes after the checkpoint will be removed. Cancel was clicked; no restore occurred.

Current workspace documentation explicitly says a run-card restore removes later chat entries, and changes code rather than database data or uploaded files:
https://www.macaly.com/docs/en/integrations/macaly-cloud#working-alongside-the-macaly-editor
https://www.macaly.com/docs/en/agent/modes#can-i-restore-a-previous-version-of-my-project

## Proposed candidate for a bounded round trip

Select the 12:14 AM completed run card, not the latest 1:53 AM card that already matches the current functional baseline. Timestamp-correlated source candidate: 32d6a9a65e7cf41d8440b65bfe76e0edec511e64 (04:14:19 UTC). This correlation is not independent proof of the platform checkpoint contents; verify actual bytes after restoration.

Compared with preserved baseline f11ca702: exactly three paths differ, all evidence/readiness material:
- docs/PRODUCTION_OPERATIONS.md
- docs/evidence/managed-claim-recovery-20261015.md
- src/lib/production-readiness.ts

The entire convex directory, guided workspace registry and Mission Control component have zero diff. This candidate preserves provider recovery and execution-claim schema/contracts. It is preferable to older pre-accounting/pre-claim candidates that are known incompatible. It tests a whole-source platform checkpoint mechanism across an evidence-text revision; it is not a rollback across a backend feature migration.

## Final action needing a specific decision

The remaining Restore click would rewind the selected project code and remove later Macaly chat history. Existing general build/test instructions do not specifically approve that chat-history removal. No destructive confirmation was accepted. Do not treat documentation or the platform warning itself as authorization.

If authorized, capture a fresh source identity after preparation, verify Testing remains selected and no editor is active, restore the 12:14 AM card, compare actual source and backend contracts, validate the restored preview/Testing state, then return all application and documentation files to the preserved latest source and validate again. Do not publish the historical candidate or import any database over Live. Do not claim deleted chat history is recoverable merely because source files are in GitHub.

If preserving the original chat timeline is required, do not apply this restore. A separately authorized disposable duplicate can isolate the platform restore exercise, but no duplicate project was created during this preflight.
