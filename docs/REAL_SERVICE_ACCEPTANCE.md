# Real-service acceptance — October 15, 2026

The batch used Managed Testing (quick-rabbit-810) and real configured external services. Tests used trusted administrative test identities, not a new browser OTP session. Live data was not used for experiments. Earlier LocalBoost production acceptance remains separate evidence.

Overall acceptance is **partial**. Working transport and a small sample do not complete a broad capability.

| Area | Actual observation | Assessment |
|---|---|---|
| Image generation | Three reviewed geometric-image attempts returned HTTP 400; diagnosed response was Cloudflare error 8007, input content-filter rejection. | Failed provider acceptance. No filter bypass. Billing unknown. |
| Image perception | LLaVA described a locally generated single red square on white. | Basic fixture matched; phrasing imperfect. |
| Transcription | Whisper returned NEXUS FORGE ACCEPTANCE TEST, THE NUMBER IS SEVEN for the known synthesized phrase. | Matched after case/punctuation normalization. |
| Sampled frames | Three LLaVA calls on the same known image returned descriptions; one invented four squares/borders. | Transport passed, quality mixed: 2/3 consistent. Not full-video or browser extraction validation. |
| Team execution | A second active contributor launched the explicitly shared approved mission. Council and artifact verification completed; runner paused at awaiting_artifact_approval. Private ordinary mission reads were denied. | Backend team execution passed. No delivery approval/dispatch. |
| External adapter | HTTPBin GET through hardened egress returned exactly args, headers, origin and url. | Real transport/contract passed; not autonomous external reasoning. |
| Automatic outcomes | Three reports derived from actual task scores were committed and imported by configured GitHub polling with commit/blob/report digests. | Immediate scheduled-import path passed; hourly longevity unmeasured. Temporary feeds disabled afterward. |
| Adaptive policy | Three nonoverlapping, same-method six-task periods produced reuse-with-verification with exact evidence IDs. | Functional selection passed, not causal improvement. Different providers on public tasks do not establish independent replication. |

Exact results: [seven-real-service-acceptance-20261015.json](evidence/seven-real-service-acceptance-20261015.json). Prompts and answers: [matched-provider-comparison-20261015.json](evidence/matched-provider-comparison-20261015.json).

## Matched model comparison

| Provider | Baseline | Structured prompt | Baseline latency | Structured latency |
|---|---:|---:|---:|---:|
| Cloudflare | 2/3 | 3/3 | 593 ms | 441 ms |
| Groq | 3/3 | 3/3 | 565 ms | 528 ms |
| Cerebras | 3/3 | 3/3 | 332 ms | 293 ms |

Arithmetic, sorting and deduction; six requests capped at 384 output tokens each. Named evaluation calls never fall back. Invocation receipts retain reported usage; missing cost is unknown. Timings are single observations, not performance guarantees. Published cases are not unseen-task evaluation.

The deterministic policy fixture comparison remained baseline 3/10 versus candidate 10/10. Held-out fixture labels do not establish experimental blindness.

## Shipped engineering

Real configured model-comparison action, durable admission, accounting, explicit attribution, matched prompts, exact scoring and preserved failures, with UI on /comparisons. Media credentials now normalize consistently; bounded sanitized HTTP/error-code diagnostics replace generic provider failures. Tests verify redaction without deleting ordinary letters. Dated evidence is visible on /capabilities.

Actual task-score reports are retained at nexus-forge-outcomes/k97fjhre91z0vzn1ttj2mgs3v58gbrb8/. They describe isolated acceptance tasks, not production business outcomes. Exact source commit: c1405c12397a67115c934521115c852df71fad51.

## Concrete remaining dependencies

- Image-generation acceptance: provider content-filter rejection remains. Its filter is preserved.
- Reliable media quality: representative labeled evaluation corpus. Full-video understanding/music: a selected capable runtime and integration; none is configured.
- General authenticated write tools: defined services, per-tool scopes/credentials, safe transport and reviewable write contracts. Current configured adapters are read-only GET JSON.
- SSO/enterprise provisioning: identity provider, tenant and configuration; no enterprise IdP is configured.
- Product/business improvement: instrumented real products and sufficiently long comparable user/task observations. Public task-score reports do not substitute for those outcomes.
- Independent competitor/scientific replication and unseen transfer: independent protocols/data and sustained observation.
- Billing reconciliation, scheduled-backup acceptance, production workload certification and real provider/host-failure acceptance remain on hold.

## Final verification

457 tests across 77 files passed, including named-provider comparison and diagnostic redaction tests. Strict typechecking passed. Testing returned to 2,009 original documents across 54 exported document-table files; all counts and canonical document hashes match the pre-drill snapshot. Storage returned to zero files. The only added documents and files were attributable to this acceptance run.

No all-seven success claim is made. Existing production missions were not replayed. Temporary acceptance data/storage are returned to the pre-drill Testing snapshot, with restoration verification recorded in the final response.
