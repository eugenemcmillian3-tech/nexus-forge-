# Research Oracle Network Egress Boundary

Status: proposed architecture / implementation plan. This document does **not** mean network-level egress enforcement is deployed.

Tracking issue: https://github.com/eugenemcmillian3-tech/nexus-forge-/issues/51

## Problem

`convex/research.ts` validates URL syntax and manually revalidates redirect destinations, bounds response sizes, limits redirects, checks content types, and applies timeouts. These application-level controls are useful, but a hostname can resolve to a private or reserved address, and DNS answers can change between validation and connection. The current runtime fetch API does not expose a verified, pinned destination IP to this code. Therefore this layer alone cannot prove protection from DNS rebinding or private-address access.

## Required architecture

Use a dedicated, trusted outbound-fetch service as the only component allowed to retrieve user-discovered research pages. The service must enforce destination policy at connection time, not just by parsing the URL.

Required request/response contract:

- Request: absolute HTTPS URL only; no credentials; approved port only; bounded request metadata; no caller-controlled proxy, headers, or redirect mode.
- Before every connection: resolve the hostname, normalize IPv4/IPv6 and IPv4-mapped IPv6, reject loopback, private, link-local, carrier-grade NAT, multicast, reserved/documentation, unspecified, and cloud-metadata ranges. Use a vetted IP-range library and keep its range data current.
- Prevent DNS time-of-check/time-of-use: connect to the validated/pinned address while preserving the original hostname for TLS SNI and certificate validation, or use a trusted proxy whose documented implementation enforces this property. Re-resolve and revalidate each redirect hop.
- Deny direct outbound page-fetch traffic from the application runtime where the platform permits network policy enforcement. The application must call only the configured gateway.
- Enforce timeouts, response byte limits while streaming, redirect cap, HTTPS/content-type policy, and safe error handling in the gateway as well as retaining relevant application-level limits.
- Fail closed: if the gateway URL, authentication, health check, or required policy is missing/unhealthy, Research Oracle source retrieval must stop with a safe operational error. Do not fall back to direct `fetch()`.
- Protect gateway credentials using the hosting platform's secret manager. Never commit secrets or print secret values in logs.

## Deployment decision gate

Before implementation, select a runtime that can guarantee destination-IP pinning and TLS hostname verification. Do not assume a generic edge Worker or ordinary `fetch()` satisfies that requirement. Evaluate these options with evidence:

1. A managed outbound proxy with explicit private/reserved destination blocking and DNS-rebinding protection documented by the provider.
2. A small dedicated proxy service using a vetted HTTP client/agent that supports connection-time IP validation/pinning and TLS SNI verification, with network rules preventing direct application egress.

Choose the option that is supportable at the project's low-cost operating target, has a health endpoint, and can be integration-tested. Record the provider/runtime, network controls, timeout and size limits, secret configuration names (names only), rollback, and operational owner in this document before rollout. Do not deploy a placeholder proxy that merely calls `fetch(url)`.

## Application integration

1. Add a single internal gateway client; reject requests when configuration is absent.
2. Route both source-page retrieval and any other arbitrary research-target fetch through that client. Keep search-provider access separate and explicitly scoped.
3. Revalidate redirect hops in the application and gateway; never let redirects escape the gateway policy.
4. Preserve operator authentication, mission ownership checks, citation allowlisting, and existing human-approval behavior unchanged.
5. Add a health/config check that reports configured/healthy state without exposing secrets.
6. Record the gateway policy version and safe outcome metadata in diagnostic evidence; do not store sensitive headers or credentials.

## Acceptance tests and evidence

- Public HTTPS host succeeds and returns bounded HTML.
- HTTP, credentials, non-approved ports, and malformed URLs fail.
- IPv4 and IPv6 loopback/private/link-local/multicast/reserved/unspecified and IPv4-mapped IPv6 are blocked.
- Cloud metadata hostnames and known metadata IPs are blocked.
- DNS rebinding simulation proves the actual connection cannot reach an address outside the validated public set.
- Every redirect hop is independently checked; private destination redirects never receive a connection.
- Slow responses, oversized streaming bodies, invalid content types, redirect loops/cap overflow, unavailable gateway, bad gateway credentials, and failed health checks fail safely.
- Integration tests prove the application never falls back to direct fetch when gateway configuration or health is unavailable.
- Run deployed end-to-end checks and attach the deployment identity, timestamp, sanitized test results, and logs with secrets redacted.

## Current status

- Application-level URL/redirect regression coverage is present in GitHub main (PR #50 merged).
- Macaly's unit suite and production build have passed in the latest recorded run.
- No configured `RESEARCH_EGRESS_GATEWAY_URL` or verified destination-pinning egress deployment was found in the latest environment scan.
- Network-enforced protection remains **not implemented / not verified** until the deployed acceptance tests above pass.
