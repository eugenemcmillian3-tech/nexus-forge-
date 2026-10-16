# Media chain — October 16, 2026

The supplied Node chain is adapted to NEXUS FORGE's TanStack/Convex stack and available on the dedicated Multimodal Studio page. A Convex Node action replaces the Next.js route example. No new application framework or public media endpoint was introduced.

## Changes from the supplied code

- Cloudflare accepts both CF_ACCOUNT_ID/CF_API_TOKEN and the existing CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN names.
- Hugging Face image requests use its currently deployed Nscale route for FLUX.1 Schnell. The old HF Inference image route is not assumed available.
- Pollinations uses its current key-authenticated API. Add POLLINATIONS_API_KEY to server secrets if desired; the no-key legacy URL is not assumed to work. No key was requested or exposed.
- MusicGen is an explicit non-commercial research option. Its model weights are CC-BY-NC-4.0. The chain checks its HF Inference deployment mapping before requesting generation. Requested duration is recorded; successful provider duration is not certified.
- Successful generated files are cached privately for 24 hours. Cache keys include owner, normalized prompt, kind, dimensions, duration and research mode. Timeout changes do not create a different content cache key.
- Convex transactions replace process-local cache/inflight/cooldown Maps. Concurrent identical requests return the existing pending job reference instead of starting another provider call. Repeating the same completed request key returns its immutable saved receipt. A new request key can reuse real generated content with cached=true.
- Placeholders are explicit in results, filenames, notes and UI. They are never reused as successful generation cache entries. Image placeholders are deterministic PNG color cards rather than SVG. Audio placeholders are one second of 8-bit mono WAV silence.
- Content-policy rejections stop failover. Ordinary outages, invalid responses, authentication errors and quotas can move to another configured provider. One short Retry-After up to five seconds may be retried; there are at most two attempts per provider and a 90-second total request budget.
- Responses are stream-bounded; only supported media signatures and up to 2 MiB are retained privately. FLAC support was added to the private store. No public asset URL is created. Receipts contain references and statuses, never generated base64 or provider secrets.
- Owner receipt/cache/media quotas remain in force. A crash or persistence failure can leave an uncertain pending/failed entry that requires reconciliation, rather than automatically repeating a potentially billed call.

## Real acceptance

Managed Testing used the actual configured Cloudflare and Hugging Face secrets. Pollinations was not configured. These were independent administrative test identities, not a claim of end-user provider consent.

| Request | Observed result |
|---|---|
| Image, red circle on white | Cloudflare returned HTTP 400 under its content filter. Failover stopped. A labeled 1024 × 1024 PNG placeholder was saved, 5,653 bytes. No AI image was generated. |
| Music, experimental MusicGen enabled | HF model discovery returned no live HF Inference deployment for musicgen-small. The chain recorded unavailable, with a one-hour cooldown. A labeled 8,044-byte WAV placeholder was saved. No AI music was generated. |
| Same request replay | Both exact request keys returned the existing serialized result without another provider call. |
| File decode | ffprobe decoded PNG at 1024 × 1024 and WAV at 8,000 Hz, pcm_u8, duration 1.000000 second. |
| Signed-in browser | Reserved-email OTP sign-in passed. One music submission without the experimental provider produced “Placeholder only — AI generation did not succeed” and “Audio output: one second of silence.” Private preview decoded 1.00 second. The labeled file persisted after reload. Browser signed out and closed. |

The chain keeps a supported placeholder asset available when providers cannot generate. It does not establish successful AI generation, unrestricted provider access or guaranteed zero-cost hosting.

## Validation

487 tests across 82 files passed. Nine chain integration checks cover 429 failover, current Nscale response shape, private cache isolation, concurrent deduplication, policy-stop behavior, persistent cooldowns, one short retry, invalid media, unavailable MusicGen hosting, anonymous denial, option validation, HTTP-date Retry-After and bounded-stream cancellation. The targeted chain suite passed again after result wording was clarified. Managed Testing accepted the backward-compatible deployment.

Before cleanup, all original records were unchanged. New files, cache locks, cooldowns, receipts, audits and the reserved browser user were attributed to the isolated acceptance identities. The restore archive explicitly included empty entries for the two new tables, so new test rows would not remain merely because those tables were absent from the old baseline export. Final restoration counts and hash verification are recorded with the release result.

## Limits and next steps

This does not solve provider-side content filters, quota restrictions or absent hosting. Pollinations still requires its own key and balance; Hugging Face credits and Cloudflare usage remain subject to their account limits. No purchase, plan upgrade or billing change was made.

For reliable music generation, a separately hosted capable runtime remains necessary if MusicGen hosting is unavailable. Self-hosted ACE-Step remains an option, with computing supplied separately. Existing Gemini, Cloudflare and deterministic media tools remain available as distinct explicit operations.

Current primary contracts: [Cloudflare FLUX](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/), [HF Nscale](https://huggingface.co/docs/inference-providers/providers/nscale), [MusicGen model card](https://huggingface.co/facebook/musicgen-small), [Pollinations API](https://gen.pollinations.ai/llms.txt).
