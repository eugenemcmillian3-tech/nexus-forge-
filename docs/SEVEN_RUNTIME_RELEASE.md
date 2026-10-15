# Seven runtime workflows — 2026-10-15

This release implements the seven scoped workflows requested together. It does not mark every broader roadmap milestone complete. External-access acceptance remains on hold.

| Area | Previously | Now | Evidence limit |
|---|---|---|---|
| Multimodal | Private media, templates, browser speech and metadata | Explicit Cloudflare FLUX image generation, Whisper transcription, LLaVA image description and three sampled video-frame descriptions; generated images stay private | Controlled provider responses tested. No live provider quality or billing acceptance claimed. Samples exclude intervening events and audio. |
| Team missions | Membership, roles and notes | Owner-admin explicitly shares selected brief/status/approval and may delegate launch to active contributors/admins | The same original approval, dependency, resource and incident preflight applies; private artifacts and credentials remain private. |
| External agents | Immutable field contracts and examples | Explicitly enabled public HTTPS GET JSON adapters via the existing DNS-safe egress gateway; exact input/output fields, endpoint/version binding and revocation | No arbitrary code, automatic mission-data forwarding, provider secrets, authenticated POST or external side-effect guarantees. |
| Automatic outcomes | Manual pinned report import | Opt-in immediate/hourly GitHub main polling with exact commit resolution, Git blob verification, report SHA-256 and mission-specific report path | Product must emit product-outcome-v1. Source integrity does not validate measurement truth. Identical content across commits is deduplicated. |
| Adaptive planning | Stored outcomes and advisory summaries | Every new Council planning attempt selects evidence-first or reuse-with-verification from this mission's imported product periods; selections retain evidence IDs | Minimum three comparable nonoverlapping periods, sample size >=5 each, exact metric/target/method. Any selected missed target retains evidence-first. No provider-route change or causal improvement claim. |
| Evaluation | Operator-entered preregistered paired results | Versioned server-run baseline/candidate policy evaluator, complete fixture report, designated held-out labels and export | Published deterministic policy fixtures are software tests, not independent model/scientific benchmarks or unseen transfer evidence. |
| Integrated acceptance | Separate feature tests | One controlled backend mission test links private perception, team launch, external adapter, feed ingestion, adaptive selection and benchmark comparison | Network responses and outcome figures are synthetic fixtures, not production results. Full signed-in browser/live-provider mission acceptance is not claimed. |

## Comparison

The immutable outcome-policy-benchmark-v1 fixture set compares:
- Baseline: reuse after any three positive rows, without provenance, overlap or contract checks.
- Candidate: comparable imported periods with provenance, overlap, minimum-population, regression and contract gates.

Observed deterministic result: baseline **3/10**, candidate **10/10**. Candidate passes **6/6** cases designated held out in the versioned fixture manifest. Cases and expected outputs are public, and no training is performed; the labels do not establish experimental blindness or general intelligence. The report retains baseline failures rather than discarding them.

## Runtime safety and persistence

Provider/tool requests are admitted transactionally under owner+requestKey, with immutable kind/input and an owner receipt quota. Identical completed requests return their saved receipt. Pending, failed and conflicting requests cannot automatically retry. An uncertain network call may already have been billed; actual billing remains unknown. New keys represent deliberate new attempts.

Media limits: prompt <=2048 characters, <=3 private PNG/JPEG inputs or one supported audio input, <=2 MiB per stored asset. Video is decoded locally (<=20 MiB), scaled to <=1024 pixels on its longest side, and sampled at start, midpoint and 95% duration. Three private images are uploaded; the original video is not sent by this workflow. Descriptions are provider inference and must be checked.

External tools receive only explicitly entered JSON fields, encoded into GET query parameters. Outputs must be bounded application/json, exactly match declared fields, and pass gateway status/truncation/redirect checks. Output is rendered as text and never evaluated as code. Revocation is rechecked before saving a successful result. Revocation cannot recall data already sent.

Feed generations invalidate in-flight and scheduled work after disable/re-enable. Persistence checks that the feed is still enabled, owns the mission and matches the exact report path before accepting observations. Poll errors preserve previous evidence and schedule the next hourly check. Existing backup schedules remain untouched.

The Council policy is mission-specific and appended to frozen preflight context, so reviewed continuation reuses its original context. It cannot approve execution or change human authorization.

## Verification

The initial full regression passed 448 tests across 74 files. Additional media-mode and scheduled-import checks were then added and passed. Final verification counts and deployment status are recorded in the release response. Original 16-page guide and 23 routes are preserved.

No test records were inserted into Live, no existing mission was replayed, and no external dispatch was initiated. Synthetic tests run in isolated convex-test databases. Public runtime endpoints retain authentication and ownership/team permission checks.

## Remaining broader work

Representative real media quality, independently verified product analytics, causal learning improvement, independent competitor/scientific replication, full-video/music capability, general external write tools, SSO and enterprise provisioning remain broader work. Billing reconciliation, scheduled-backup acceptance, production workload certification and real provider/host-failure acceptance remain on hold. This implementation does not claim AGI, superintelligence, novelty or enterprise certification.
