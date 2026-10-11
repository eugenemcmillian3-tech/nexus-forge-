# NEXUS FORGE source reconciliation audit

Audit date: 2026-10-11

## Decision

Do not copy the Macaly working tree over GitHub `main` wholesale. The live Macaly app and the GitHub repository currently have materially different source trees and route architectures. A blind sync risks removing live functionality, overwriting backend schema expectations, or publishing incompatible Convex code.

## Live Macaly snapshot

- Production URL: https://bphntw8kdojl9qvuifywyjtk.macaly.app
- Preview build status at audit: succeeded
- Publish status at audit: READY
- Convex deployment configured for both preview and publish: `tame-rat-826`
- Dedicated route files observed under `src/routes/`: `artifacts.tsx`, `capabilities.tsx`, `council.tsx`, `delivery.tsx`, `evidence.tsx`, `incidents.tsx`, `learning.tsx`, `manifest.tsx`, `mission.tsx`, `orchestrator.tsx`, `portfolio.tsx`, `providers.tsx`, `readiness.tsx`, `roadmap.tsx`, and `workflow.tsx`, in addition to the overview and root routes.
- Ownership isolation regression coverage includes anonymous/cross-operator reads, cross-owner runner lookup/tick, ignored client-supplied owner filters, and authenticated ownership on mission creation.
- Latest Macaly local validation reported 7/7 ownership tests passing, strict diagnostics passing, full test suite passing, and production build passing. This is Macaly sandbox evidence, not GitHub Actions evidence.

## GitHub snapshot

Repository: https://github.com/eugenemcmillian3-tech/nexus-forge-

- PR #3 (mission-runner ownership guard) and PR #4 (ownership regression tests) are marked merged by GitHub.
- The inspected GitHub `src/routes/index.tsx` still contains a monolithic workspace page rather than the current Macaly route architecture.
- GitHub `convex/readiness.ts` and `convex/manifestIntelligence.ts` were not found at the inspected default branch path during this audit. The live Macaly tree contains both files.
- The inspected GitHub `convex/schema.ts` is a smaller/older schema than the current Macaly schema.
- GitHub combined status for the inspected ownership-test commit returned an empty status list. Do not treat CI as passed until a real workflow/check result is visible.

## Safe reconciliation sequence

1. Freeze broad copy/sync operations until an explicit source-of-truth decision is made.
2. Inventory tracked file paths and compare high-risk files first: `convex/schema.ts`, mission ownership/runner functions, auth configuration, HTTP delivery handlers, generated Convex types, and route definitions.
3. Compare environment-variable *names only*; never copy values, API keys, deployment keys, tokens, customer data, or local database files.
4. Reconcile schema and backend contracts before moving UI routes that depend on them.
5. Port changes in small logical PRs; do not overwrite unrelated files. Run type checks, targeted tests, full tests, and build on the candidate source.
6. Confirm GitHub Actions checks pass, then deploy only through the intended delivery path and verify the live URL plus build/test/deployment evidence.
7. Update this document with each reconciled batch and the commit/CI/deployment evidence.

## Current next priority

Complete a file-level, secret-safe diff and designate the authoritative source for each area before any bulk synchronization. The Macaly production app remains the live reference for current page coverage; GitHub `main` must not be assumed to contain the same feature set.
