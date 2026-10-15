# Proposed backup operating policy

Status: DRAFT — targets proposed for operator review; recurring jobs and retention enforcement are not configured. This document does not close the backup release gate.

Scope: NEXUS FORGE platform project bphntw8kdojl9qvuifywyjtk; platform source eugenemcmillian3-tech/nexus-forge-. Dispatch repository nexus-forge1/no-dispatch is separate. Live database tame-rat-826; isolated Testing database quick-rabbit-810. Verify identities before every restore.

## Proposed targets

| Requirement | Draft target | Current evidence |
| --- | --- | --- |
| Database capture | Daily at 03:00 America/New_York, and before production data/schema migrations | One retained Live snapshot and isolated restore verified; no daily job configured |
| Media capture | At each upload/change, with daily inventory comparison | Current single asset backed up and retrieved; app-upload inventories empty at observation time |
| Retention | Keep 30 daily recovery points and a pre-migration recovery point until migration acceptance | No automatic expiry/deletion enabled; do not delete current verified copies based on this draft |
| Maximum data loss (RPO) | 24 hours | Target only; requires successful recurring captures and freshness monitoring |
| Full service recovery (RTO) | 4 hours from declared incident to verified service | Target only; current drills do not measure full service recovery |
| Restore exercise | Monthly in isolated Testing, and after a material schema/storage change | One-time table and asset restores verified; no recurring drill configured |
| Freshness escalation | Flag missing/failed capture or newest verified capture older than 24 hours | Existing public-route monitoring does not monitor backup freshness |

## Private recovery point contents

Preserve the database export, original uploaded assets, source/version identity, capture time, schema/function contract reference, file sizes and SHA-256 digests. Record each component separately; a source commit or table ZIP alone does not restore an entire service. Keep database ZIPs and their private records out of GitHub, public media storage and client bundles. The current database and banner copies are retained privately as user files; they are one-time copies, not a recurring backup system.

A backup is accepted only after transfer completed, stored-copy retrieval passed its checksum, and isolated restore checks passed for the documented scope. Retain receipts without exposing private records or credentials. Failed, incomplete or stale captures must not replace the last verified recovery point.

## Restore procedure

1. Preserve incident evidence and current state. Select the required recovery point; confirm schema/function compatibility.
2. Verify the restore destination is Testing quick-rabbit-810, distinct from Live tame-rat-826; export Testing's current state first.
3. Restore tables into Testing only. Compare expected table counts, representative mission/artifact/delivery relationships, owner isolation, ledger/report fields and original media bytes/rendering. Do not execute restored active missions or dispatches merely to validate a backup.
4. Restore the pre-drill Testing state after the exercise. Record actual elapsed times and limits. Never reinterpret a module rollback or snapshot import duration as the full service RTO.
5. A real Live recovery needs a specific incident recovery decision, compatible source and an explicit target check. This draft does not authorize replacing Live.

## Requirements before activation

- Operator accepts or revises the draft schedule, retention and recovery targets.
- Select a supported recurring export mechanism and private backup destination with service access appropriate to that mechanism. Current Macaly connector guide searches expose export/import but no scheduling or retention controls; this is a capability limit, not proof that Macaly has no such feature elsewhere.
- Validate at least one scheduled capture, retrieval and isolated restore; record the next due time and successful freshness escalation evidence. A reminder or CI cron without a captured private backup is insufficient.
- Confirm media inventory coverage, access recovery, scheduler timezone/DST behavior and retained-copy deletion/recovery semantics. No automatic deletion was performed by this work.

Release status remains HOLD until all required gates have demonstrated evidence. This proposal does not establish capacity, billing, managed-host recovery or whole-version rollback evidence.
