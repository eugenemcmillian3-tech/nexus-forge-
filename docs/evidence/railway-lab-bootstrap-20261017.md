# Isolated recovery lab bootstrap — 17 October 2026 UTC

Created separate private Railway project nexus-forge-recovery-lab (b6124b64-1d28-4818-930a-71e3680b5746), environment fault-lab (e4c8f286-62de-4f3d-b13a-07aefff65dae). No production records, provider keys, NEXUS FORGE connection variables or payment integration copied.

Deployed the reviewed Convex template with official Convex backend/dashboard images and Postgres 17. Postgres reached SUCCESS, one running replica, persistent volume. Both Convex images failed at CREATE_CONTAINER: Railway reported it could not connect to the image registry. Build and deploy logs were empty, so no application runtime failure was inferred. A single explicit source reconnection/retry using the official documented image names also failed before container startup. No restart/recovery acceptance was performed or claimed.

Convex's own docker-compose source confirms ghcr.io/get-convex/convex-backend:latest and ghcr.io/get-convex/convex-dashboard:latest. The template's dashboard PORT setting was 3210; corrected it to 6791 based on the official dashboard port mapping, with deploy skipped pending registry resolution. That correction does not resolve the registry connectivity failure. Do not call the lab fully deployed merely because the database is online.

Backend service d95b5647-c5fa-4f9c-8459-fa93d72671ac; dashboard 602ed631-f9e3-4a35-a07c-97a0676276b5; Postgres d7ba3525-075c-47eb-bfaa-a7bd7258c11d. Backend failed attempts de33fec0-47ec-4aa9-8fa6-11b5876b2170 and 243a108b-80e6-457e-9958-555f2baf84f1. Database successful deployment 6638f45b-f5f7-4735-bc22-6e923154d5f0.

Next dependency is successful retrieval of official container images by Railway. After that: validate service health and private admin configuration, deploy a synthetic-only compatible test fixture, preserve durable state, interrupt the isolated backend and verify recovery/invariants. Self-hosted Railway behavior would still not prove managed Macaly/Convex host recovery. Customer payments remain unchanged; no Live or Testing NEXUS FORGE data changed.
