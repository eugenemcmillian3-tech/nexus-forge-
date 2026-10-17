# Isolated recovery lab bootstrap — 17 October 2026 UTC

## Current result — registry blocker resolved at 16:06 UTC

The template used stale image namespace ghcr.io/get-convex. A fresh read of the official Compose file now specifies ghcr.io/convex/convex-backend:latest and ghcr.io/convex/convex-dashboard:latest: https://raw.githubusercontent.com/get-convex/convex-backend/main/self-hosted/docker/docker-compose.yml . Earlier indexed metadata and the historical statements below are superseded by this direct source and fresh runtime evidence. Earlier conclusions that the old names were current were incorrect.

Verified anonymously from Railway: current namespace token and manifest requests both HTTP 200; both indexes advertise Linux amd64 and arm64. Pinned lab sources to the observed immutable index digests:

- Backend ghcr.io/convex/convex-backend@sha256:d715e9ec088784407ca4ba2d3db592702cd328d02c76cdca3852c0018f2a76b4
- Dashboard ghcr.io/convex/convex-dashboard@sha256:f85cf0d0448b9c835ae3df5c7c1c6f0145dd4c8f0f92eb0245daf304efdd9f1a

Backend deployment 026b0701-555e-4eb9-8c97-e79ee0da5b83 and dashboard deployment c4b6f0b3-5967-469b-b928-da9b4ac71d0e both reached SUCCESS. The prior dashboard port fix (6791) applied. Backend startup now uses restrictive umask 077 and writes generated admin output to its persistent credentials directory instead of printing it in logs; failures stop startup. No admin key was read, published or copied into application code.

A separate bounded internal health script (deployment abf246af-06d1-4da0-a467-5e7a5933e023, SUCCESS) completed at 16:06:11 UTC. Backend private /version returned HTTP 200 with the literal value unknown (therefore no semantic backend version claim); dashboard private root returned HTTP 200, 4175 bytes. Image digests provide deployment identity. Postgres is online. Initial transient search-bootstrap errors were followed by SearchIndexBootstrapWorker completion; no search functionality acceptance was performed.

Bootstrap is now verified at container and internal HTTP health scope. Synthetic fixture deployment, authenticated admin access validation, durable-state interruption/recovery, four-hour RTO and managed Macaly host-recovery proof remain separate and incomplete. No production/managed Testing data, backup records, provider execution or customer payments changed.

## Historical investigation (superseded where noted)

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

## Controlled persistent-volume drill — 16:08–16:11 UTC

Scope: synthetic filesystem sentinel on the existing backend volume only. No application fixture, privateMedia object or mission data was loaded. The connected OAuth tools expose no container shell; authenticated Convex admin/CLI verification was not performed. The supported image includes generate_admin_key.sh, whose output remains private inside the backend. No key was retrieved or exposed.

Seed bytes were the ASCII line NEXUS_FORGE_SYNTHETIC_RECOVERY_SENTINEL_20261017T1608Z followed by LF, at /convex/data/recovery-drill/sentinel. Independently computed expected SHA-256: 03ad402c294884cc1185fec28504bbcc222075978739aed87d5347098886f555 . Seed deployment 7cc6b500-c87c-4b8c-a458-01de7eee3df4 logged that hash and reached SUCCESS. An earlier successful redeploy 1f842f6a-8a29-4b45-8d20-81592c5ae289 did not yield sentinel log evidence and was not counted as a successful sentinel check; a source-triggered deployment supplied observable evidence.

Removed the sentinel-creation branch before verification. Deployment d721e600-4f43-4e57-8fb7-a1cd79062891 uses test -s and sha256sum only for this file; its deployment context confirms the check exists and the synthetic seed literal/creation branch is absent. Replacement reached SUCCESS and logged the matching hash at 16:10:06.921 UTC. Then used supported restart-service on that exact deployment, within the authorized isolated recovery drill. At 16:10:36.874 UTC the restarted deployment again logged the same hash; backend listening followed at 16:10:36.878 UTC. The same deployment is SUCCESS with one running replica. Missing sentinel would fail startup rather than recreate the bytes.

Post-restart diagnostic deployment 9cbb5160-3e8b-41f0-9baf-b515c8aebd7e reached SUCCESS and completed: backend private /version HTTP 200 at 16:11:01.431 UTC; dashboard private root HTTP 200 at 16:11:01.445 UTC. Postgres remained online and was not restarted. No production or managed Testing records, media or backup copies changed; no inference, delivery or customer-payment action occurred.

Result: PASS for this synthetic file's byte preservation across container replacement and an in-place backend restart, plus subsequent internal HTTP health. This is not an abrupt host-kill, interrupted mutation/job, authenticated document/file-storage relationship, backup restore, full-service recovery, four-hour RTO or managed Macaly host-failure verification. No exact outage duration is claimed because no continuous availability probe was running. Next work is an authenticated synthetic Convex record-and-file fixture through supported local-in-container CLI execution or an authenticated Railway shell; never transmit the admin key through public endpoints or logs.

## Authenticated synthetic Convex record/file drill — 16:15–16:17 UTC

Completed the previously pending authenticated fixture using supported in-container generate_admin_key.sh, Convex CLI deploy, and ConvexHttpClient. The admin key stayed in the backend container/process environment; no public credential endpoint, URL or log was created. No external Railway shell/login was required. The synthetic fixture source is docs/evidence/fixtures/railway-synthetic-recovery-20261017.cjs; it is lab-only and does not copy or deploy NEXUS FORGE product functions. Convex client installed was 1.47.0, with its package lock retained in the private lab volume.

Seed deployment 1d7cd2ef-3b16-4dca-988e-4c537f328c60 reached SUCCESS. Fixture baseline logged PASS at 16:15:35.143 UTC: one syntheticRecoveryDocuments record, one referenced Convex storage object, 53 original bytes. Independently calculated expected SHA-256 matches retrieved file bytes: a0f3a51459f557e699480bc34e9162b923bdcd97d30c1cc427a17a521d754107 . The action uses storage.get rather than generating a public storage URL. Owner/status fields and the stored digest/byte count were checked. Baseline private receipt retains record/storage IDs; only their aggregate identity fingerprint is reported here: 1590ecec116401b4bbc73fcff7ff32db3081d74c8bf483ffe6b7176183593048 .

Switched the deployed wrapper to constant MODE=verify before interruption. Deployment a07050ad-a633-4bd4-9bac-5cb63d51975d context exactly matches that verification-only command. In this mode it does not deploy code, seed records, store files, install dependencies or replace the baseline receipt; missing or changed data fails verification. It first passed after replacement at 16:16:56.471 UTC.

Then used supported restart-service on that exact backend deployment. After restart the fixture logged PASS at 16:17:20.439 UTC with the same record/storage identity fingerprint, 53 bytes and SHA-256. Both anonymous and synthetic foreign-owner queries were denied with OWNER_DENIED before and after restart. Owner identities were supplied through the supported administrative identity override, so this verifies the fixture's server-side ownership predicates, not actual customer login/JWT/session behavior. Final status: backend, dashboard and Postgres online with one running replica each; no pending work. The bounded diagnostic script has zero running replicas and no schedule/domain.

Result: PASS for authenticated synthetic record-to-storage relationship, exact retrieved original bytes/digest, record identity/status/owner preservation, and fixture access predicates across replacement and controlled backend restart. This supersedes the earlier authenticated-fixture-pending statement only within this scope. It does not verify the NEXUS FORGE production privateMedia implementation, interrupted mutations/jobs, duplicate inference/delivery prevention under process death, abrupt host failure, recovery from a saved backup, four-hour RTO or full-service/managed Macaly recovery. Production, managed Testing, existing backups, payment activation and provider/delivery execution were untouched. No data or lab resources were deleted.

## Abrupt backend process termination — 16:19–16:20 UTC

Configured the isolated backend for bounded ON_FAILURE restarts (maximum two retries) and deployed a single-use process-kill diagnostic; source: docs/evidence/fixtures/railway-synthetic-sigkill-once-20261017.cjs. Before sending SIGKILL it completed the authenticated verification-only fixture, durably wrote and fsynced an exclusive once-marker on the backend volume, then targeted only its own isolated backend child. It did not kill a Railway host, Postgres, dashboard, Macaly process or an in-flight application operation.

Fault deployment 7931a925-c7d1-4561-a733-69c6e78f0ba9 logged pre-fault PASS at 16:19:50.278 UTC, fault injection at 16:19:50.282 UTC and backend exit with signal SIGKILL at 16:19:50.293 UTC. Boot identifier changed from 8f36f4c9-3509-4e1d-ab70-d3cb6ed21bb0 to 27fdd8d9-90e2-4f11-acef-733e346cb71b after automatic restart. New process logged fixture PASS at 16:19:52.399 UTC and post_fault_verification PASS at 16:19:52.400 UTC, explicitly declining to repeat the fault.

Preserved: one record, one storage object, original identities (fingerprint 1590ecec116401b4bbc73fcff7ff32db3081d74c8bf483ffe6b7176183593048), 53 retrieved bytes, SHA-256 a0f3a51459f557e699480bc34e9162b923bdcd97d30c1cc427a17a521d754107, owner/status fields, anonymous denial and foreign-owner denial. These checks used verification mode and did not reseed or rewrite the baseline receipt. Observed time from logged SIGKILL exit to fixture PASS was 2.106 seconds; this is a single local drill observation, not measured continuous unavailability, an RTO guarantee or full-service recovery time.

Removed the active kill diagnostic afterward. Final deployment 3d195f9b-0a6b-4bbd-9729-a1d388f1d1ef reached SUCCESS; read-back confirms its command exactly matches the normal verification-only wrapper. It logged PASS again at 16:20:18.325 UTC with identical evidence. The once-marker and synthetic data were preserved. No deletion, production/managed Testing modification, provider execution, delivery or payment activation occurred.

Result: PASS for this idle synthetic backend's automatic recovery after abrupt process termination with record/file preservation. Abrupt host loss, interrupted mission/job recovery, actual NEXUS FORGE fencing/idempotency invariants under death, backup restore, production privateMedia behavior and full-service RTO remain separate unverified scopes.
