# External acceptance blockers — October 16, 2026 UTC

## Google Workspace sign-in: confirmed callback mismatch

The app's real Testing auth:signIn action returned an authorization redirect through its Convex site. That site returned HTTP 302 to Google. Google then displayed its OAuth error page. Decoding only the recognized error code identified redirect_uri_mismatch.

A separate unauthenticated authorization-page check using the configured client ID and each environment's callback confirmed the same redirect_uri_mismatch for both Testing and Live. No person was signed in, no consent was granted, no secret was printed, and no Live login session was created.

Correct the **existing Web application OAuth client matching AUTH_GOOGLE_ID** at [Google Cloud → Clients](https://console.cloud.google.com/auth/clients). Add these exact **Authorized redirect URIs**, preserving any other legitimate callbacks:

- Testing: https://quick-rabbit-810.eu-west-1.convex.site/api/auth/callback/google
- Live: https://tame-rat-826.eu-west-1.convex.site/api/auth/callback/google

The frontend domain https://www.network-x-ai.com is not the OAuth callback origin used by Convex. Do not replace the server callbacks with a frontend URL. Google's [web-server OAuth documentation](https://developers.google.com/identity/protocols/oauth2/web-server) requires a registered matching redirect URI.

After saving, a real organization user must complete sign-in. The verified Google profile's hosted-domain claim must match AUTH_GOOGLE_HOSTED_DOMAIN. That setting currently contains the exact supplied hostname, www.network-x-ai.com; custom website verification does not establish that it is the actual Workspace tenant. No alternate domain was guessed.

Macaly secrets and the OAuth client secret do not grant administrative access to the Google Cloud OAuth client configuration. No Google Cloud administrative connection is available in this session.

## OAuth route compatibility repair

Publishing exposed an environment-dependent route contract: conditional Google provider registration could omit the already-published OAuth signin and callback HTTP handlers when configuration was absent during compatibility analysis. The Google provider and its real handlers are now registered consistently. The sign-in button still follows configuration readiness, and profile verification explicitly rejects unconfigured, unverified or mismatched Workspace identities. Existing OTP and verified-email directory grant behavior remain intact.

Managed Testing deployment accepted the backward-compatible contract. All 478 tests across 81 files passed, including route registration with missing, invalid and valid configuration. A reserved-email browser session verified new OTP sign-in, reload persistence, sign-out and returning-account sign-in. Both sign-ins reused exactly one new user/account; original account records were unchanged. The test session signed out and closed before Testing restoration. This repair does not fix Google's external redirect_uri_mismatch.

## Gemini image/music: HTTP 429 remains

Previous reviewed requests to gemini-nano-banana-2.1 and lyria-3-clip-preview returned HTTP 429 without a detailed quota reason. They were not repeated during this preflight batch.

Inspect the same key's project in [Google AI Studio usage](https://aistudio.google.com/usage) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). Model discovery success does not establish generation quota. No billing upgrade, purchase or quota increase was made. A successful bounded image and music request remains necessary after access is resolved.

## Evidence preserved

The seven-page signed-in OTP browser pass remains valid: [SEVEN_BROWSER_ACCEPTANCE.md](SEVEN_BROWSER_ACCEPTANCE.md). Successful real original-video analysis and the failed generation attempts remain recorded in [GEMINI_MEDIA_BATCH.md](GEMINI_MEDIA_BATCH.md). No all-services end-to-end completion is claimed while required services are blocked.

OAuth preflight added only three temporary Testing verifier records. All original records were unchanged before cleanup. Testing returned to its exact preflight baseline: 2,016 documents across 58 exports, zero private storage files, all canonical record hashes and counts matched. Live data was not imported or replaced.

Previously held billing reconciliation, scheduled-backup acceptance, production-load and actual provider/host-failure testing remain on hold.
