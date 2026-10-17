# Isolated recovery lab bootstrap — 17 October 2026 UTC

Created separate private Railway project nexus-forge-recovery-lab (b6124b64-1d28-4818-930a-71e3680b5746), environment fault-lab (e4c8f286-62de-4f3d-b13a-07aefff65dae). No production records, provider keys, NEXUS FORGE connection variables or payment integration copied.

Deployed the reviewed Convex template with official Convex backend/dashboard images and Postgres 17. Postgres reached SUCCESS, one running replica, persistent volume. Both Convex images failed at CREATE_CONTAINER: Railway reported it could not connect to the image registry. Build and deploy logs were empty, so no application runtime failure was inferred. A single explicit source reconnection/retry using the official documented image names also failed before container startup. No restart/recovery acceptance was performed or claimed.

Convex's own docker-compose source confirms ghcr.io/get-convex/convex-backend:latest and ghcr.io/get-convex/convex-dashboard:latest. The template's dashboard PORT setting was 3210; corrected it to 6791 based on the official dashboard port mapping, with deploy skipped pending registry resolution. That correction does not resolve the registry connectivity failure. Do not call the lab fully deployed merely because the database is online.

Backend service d95b5647-c5fa-4f9c-8459-fa93d72671ac; dashboard 602ed631-f9e3-4a35-a07c-97a0676276b5; Postgres d7ba3525-075c-47eb-bfaa-a7bd7258c11d. Backend failed attempts de33fec0-47ec-4aa9-8fa6-11b5876b2170 and 243a108b-80e6-457e-9958-555f2baf84f1. Database successful deployment 6638f45b-f5f7-4735-bc22-6e923154d5f0.

Next dependency is successful retrieval of official container images by Railway. After that: validate service health and private admin configuration, deploy a synthetic-only compatible test fixture, preserve durable state, interrupt the isolated backend and verify recovery/invariants. Self-hosted Railway behavior would still not prove managed Macaly/Convex host recovery. Customer payments remain unchanged; no Live or Testing NEXUS FORGE data changed.

## Follow-up investigation

A fresh environment read confirmed the same settled state: Postgres online, both Convex services offline, four failed attempts in total, no pending work. Dashboard retry fe5e9244-53b8-4ec2-a412-5b1ddd87cd13 independently reports CREATE_CONTAINER and the same registry-connectivity error. This corroborates a pre-runtime pull blocker across both images; it does not identify DNS, authentication, manifest, or upstream availability as the root cause.

The public Railway status page reported Fully Operational, including GHCR, when checked on 17 October 2026. Its own notice says isolated failures may be absent, so this does not disprove the observed failure. Source: https://status.railway.com/ . Search-index package metadata described the official Convex packages as public, but direct package-page retrieval failed and a local anonymous GHCR request returned HTTP 403 in this restricted execution environment. These checks do not prove Railway can pull the images, nor establish that credentials are required. No token was supplied or requested, and no unverified image tag, mirror or digest was substituted.

Railway documentation search returned a private-container-registry guide URL whose fetch reported no page; no configuration decision was based on that unavailable page. Further identical redeploys were avoided. The actionable platform investigation is to inspect the failed deployment IDs above for the underlying registry HTTP/DNS/TLS or manifest error, then verify a supported official image reference before one controlled redeploy. Once both services reach SUCCESS and pass health checks, synthetic fixture and interruption testing can proceed. No fault-drill or RTO acceptance can currently be claimed.

## Version-tag diagnostic — 16:01 UTC

Tested backend source ghcr.io/get-convex/convex-backend:c449d75382dafa006f431521da4623d74edbad1a, a published tag shown in the official GitHub package listing (https://github.com/get-convex/convex-backend/pkgs/container/convex-backend). Deployment 649f173e-0d87-4a0f-9844-589414139417 reached FAILED at CREATE_CONTAINER with the same registry-connectivity error. The failure is therefore not confined to the literal latest reference; this does not prove the underlying transport/authentication/manifest cause. The backend remains configured to this diagnostic version tag; dashboard remains latest. Neither has started, no fixture was loaded, and no runtime compatibility or recovery was tested. Environment settled with five failures, both Convex services offline, Postgres online, no pending work.

The current Railway registry documentation was successfully retrieved at https://docs.railway.com/builds/private-registries . The older guide URL mismatch is a documentation-location issue. The current guide confirms GHCR support and describes credentials for private registries; it does not justify adding credentials or upgrading a plan to remedy this observed public-image failure. No credentials or plan changes were made.

## In-lab registry controls — 16:03 UTC

Created a bounded, no-server Railway Bun diagnostic script in this isolated environment: service registry-diagnostic-once (735cfd0c-cc2d-4636-8388-1fbebfe4e491). It reads no environment credentials, uses only anonymous registry requests, logs no tokens, creates no domain or schedule, and exits after its checks. Initial deployment 20e35905-bc4c-43d2-9b88-bc0d83f0dfbb and control deployment adb37be0-f42c-4a75-b91e-c3f204248741 both reached SUCCESS and logged completion. This is diagnostic execution success, not Convex deployment or recovery success.

Observed control results from the Railway runtime:

| Request | HTTP | Registry response |
| --- | --- | --- |
| https://ghcr.io/v2/ | 401 | UNAUTHORIZED, authentication required (registry challenge) |
| Anonymous token scope repository:get-convex/convex-backend:pull | 403 | DENIED, requested access to the resource is denied |
| Anonymous token scope repository:get-convex/convex-dashboard:pull | 403 | DENIED, requested access to the resource is denied |
| Anonymous token scope repository:railwayapp-templates/postgres-ssl:pull | 200 | Token response received; token not logged |

The request pattern was https://ghcr.io/token?service=ghcr.io&scope=repository:<package>:pull . These controls demonstrate GHCR reachability and a successful anonymous-token control from the lab runtime, while the two Convex package scopes deny anonymous access. This narrows the actionable issue to those package scopes and supersedes a broad connectivity hypothesis for this runtime. It does not prove the separate Railway image-puller uses identical routing, or distinguish package visibility, removal, naming, or package-specific policy. Search-index public-package metadata is insufficient to override fresh HTTP results. Manifest and blob checks for Convex could not proceed because no anonymous token was issued.

Next dependency: establish a currently accessible official Convex package reference, or confirm package visibility/access with its publisher and inspect Railway's puller error. Do not add arbitrary credentials, buy a plan, use an unverified mirror, or claim application/runtime failure. Both Convex services remain offline; durable Postgres remains online. Production, managed Testing, customer payments and backup copies were untouched.
