# Multimodal Studio retirement — October 16, 2026

Multimodal Studio is removed at the owner's request. It is outside the active roadmap and must not be reintroduced without an explicit new request.

- Removed its route, navigation, metadata, three UI components and shared-workbench media hooks.
- Removed provider execution, failover and placeholders. Internal cache/cooldown contracts remain deprecated for deployment compatibility, with no active callers.
- Legacy public generation and upload contracts remain authenticated retirement errors. They perform no provider requests, receipt creation or storage writes.
- Historical private files and schema tables remain intact. Owner-only list/download access is preserved.
- Shared Cloudflare/Hugging Face credentials and unrelated planning, team, integration, outcome and research workflows remain available.
- Original 16-page mission guidance is unchanged. Six expansion pages remain.
- Media quota, quality and MusicGen hosting issues are no longer project blockers.

Validation: Testing backend compatibility and strict TypeScript checks passed. The initial full run passed 465 tests and found one obsolete navigation-count assertion; the corrected registry plus retirement/UI/active-runtime suites then passed all 14 targeted checks. Browser Developer Integrations hydration and reload passed without creating user records.

Regression coverage checks all legacy modes, zero network/storage/receipt side effects, disabled readiness, owner isolation and historical download access. Historical media release reports are evidence of the former implementation, not current requirements.

Remaining acceptance: real organization-user Workspace sign-in; representative product instrumentation/outcome periods; broader enterprise provisioning and authenticated integrations; independent scientific/comparative/unseen-task evaluation. Billing reconciliation, scheduled-backup acceptance, production workload certification and actual provider/host-failure acceptance remain held.
