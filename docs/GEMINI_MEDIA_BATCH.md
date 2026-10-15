# Gemini media integration — October 15, 2026

The dedicated Multimodal Studio now supports explicit Google image generation, 30-second music composition, and analysis of an original private MP4/WebM video. Cloudflare operations remain separate. This completes those runtime integrations; it does not establish broad media quality or complete every research milestone.

| Operation | Model | Real Testing result |
|---|---|---|
| Image generation | gemini-nano-banana-2.1 | One request returned HTTP 429; no generated image and no automatic retry. |
| Music composition | lyria-3-clip-preview | One request returned HTTP 429; no generated music and no automatic retry. |
| Original-video analysis | gemini-3.8-flash | Passed a known two-second synthetic red-then-blue silent video. Identified red at 00:00, blue at 00:01 and no audio. This small fixture is not a representative quality evaluation. |

The configured Google key returned HTTP 200 for model discovery. Model availability does not establish generation quota. Actual billing remains unknown. Inspect the project's quota and billing at [Google AI Studio](https://aistudio.google.com/usage); no purchase or quota upgrade was made.

## Privacy and bounded execution

Secrets remain server-side. Both GOOGLE_GEMINI_API_KEY and GEMINI_API_KEY are supported. Authentication and exact private ownership are required before media is sent. Videos and generated assets retain the existing 2 MiB private limit. Google receives only the submitted prompt and selected video; the Interactions request sets store=false. Provider processing remains subject to its service policies.

One immutable owner/request key admits one provider attempt. Completed requests reuse their result. Failed, pending and changed-payload requests cannot repeat automatically. Responses are stream-bounded to 4 MB; generated base64 is decoded and bounded before private storage, and never placed in receipts. Registration failure removes the newly stored blob. Receipts contain model, source identity, output references, text, status and unknown billing. No public asset URL is created. Video analysis may miss events because models sample and infer.

## Identity configuration blocker

Google client ID and secret are present. The client ID has the expected Google suffix; the hosted-domain value fails the existing strict bare-domain validator. SSO therefore remains disabled. Set AUTH_GOOGLE_HOSTED_DOMAIN to the organization's actual Workspace domain, such as example.com, without scheme, email address or path. No tenant domain was guessed.

Register exact OAuth callbacks in [Google Cloud clients](https://console.cloud.google.com/auth/clients):

- Testing: https://quick-rabbit-810.eu-west-1.convex.site/api/auth/callback/google
- Live: https://tame-rat-826.eu-west-1.convex.site/api/auth/callback/google

A real organization-user sign-in must still validate the IdP configuration. Trusted CLI identity checks are not browser SSO acceptance.

## Validation and data return

- Full regression suite: 475 tests across 80 files passed.
- Six new integration tests cover owner isolation, original-video payload, Lyria raw steps, completed-request reuse, conflicting keys, anonymous denial and failed/oversized/incomplete responses without retries.
- Managed Testing deploy accepted the backward-compatible API contract.
- Real checks used an isolated administrative Testing identity, not an end-user browser.
- Before restoration, all pre-existing records were unchanged and every addition belonged to the isolated acceptance drill.
- Testing restored to exactly 2,009 original documents across 58 exports, zero storage files, with all canonical document hashes matching. Production data was not imported or replaced.

## Still open

Image/music successful real-service acceptance is blocked by HTTP 429. Correct Workspace domain configuration and real IdP sign-in remain required. Broader labeled media evaluation, independent research replication, representative product outcomes and complete signed-in all-seven acceptance remain empirical work. Previously held billing reconciliation, backup and host/provider failure acceptance remain on hold.

Official API contracts: [image](https://ai.google.dev/gemini-api/docs/image-generation), [music](https://ai.google.dev/gemini-api/docs/music-generation), [video](https://ai.google.dev/gemini-api/docs/video-understanding).
