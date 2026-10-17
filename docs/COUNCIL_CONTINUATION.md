# Reviewed Council continuation — 2026-10-15

Latest update: previously held acceptance resumed on October 17. See [resumption evidence and exact remaining dependencies](HELD_WORK_RESUMPTION_2026_10_17.md). A real client disconnect completed with recorded usage; managed-host/provider-network failure is still unverified. Historical notes below retain their original scope.

Owner review now continues bounded, partially completed runner Council work when every admitted provider stage has a confirmed durable answer and all remaining stages are proven unstarted. Pending, failed, ambiguous and legacy answer-less work remains blocked.

## Before and after comparison

| Controlled persisted-state fixture | Uninterrupted baseline | Continued execution |
| --- | --- | --- |
| Final Council summary | Recorded baseline | Exact same output |
| Provider calls during the compared execution | 8 | 6, with 2 saved answers reused |
| Final unique provider-stage records | 8 | 8 |
| Council memory/context receipts | 1 | Same original receipt |
| Approval, deadline and retry allowance | Original run | Original approval/deadline; one retry consumed |
| Artifact/delivery work scheduled by recovery | None | None |

The fixture starts from real function-generated, mocked-provider records, then models an interruption after the planner and one Wave 1 agent completed. Later research and learning records are introduced before continuation; they do not replace the captured inputs. This is a deterministic engineering comparison, not a live-provider cost measurement or real host-crash experiment.

The original planner-through-final-summary prompt and handoff body remains byte-for-byte unchanged. The implementation reuses the existing pipeline and its request digests rather than maintaining a second recovery implementation.

## Authorization and fencing

The existing owner-only Execution Evidence panel offers Continue saved Council work only when the backend proof is valid. It displays saved-stage and remaining-stage counts separately from unstarted retry and saved-completion confirmation. Saving requires the current evidence token and an explanation.

One transaction retires the old exact claim authority, creates its replacement, copies immutable input/effect receipts, increments the existing retry count and schedules the continuation. The retired claim and its receipts remain for audit. Old workers cannot reserve provider work, write agent state, append new Council effects or finish the replacement. A one-use authorization ticket permits only one replacement worker to start.

Before any remaining provider inference, a read-only validation pass checks every existing stage against the current role/prompt/token-limit digest. Missing stages use non-persisted placeholders only during this validation pass. No provider is called and no mutation is committed during that pass. Dependency-wave ordering is checked before admission, so an existing downstream request never depends on a missing upstream result. A mismatch keeps execution uncertain; saved answers are not discarded.

Actual continuation loads the original rendered mission, research, learning and preflight inputs. Matching durable answers are reused; only unstarted stages use the current configured routing policy. Provider/model configuration itself is not frozen by the context receipt. Every provider admission rechecks mission authorization, original deadline, latest runner, portfolio decision, dependency completion, held-resource conflicts, incidents and absence of later artifacts/deliveries.

The continuation preserves the paused execution-recovery checkpoint after Council completion. The existing Execute approved mission action can continue that same runner after its normal preflight checks, without creating a new approval record. Recovery itself does not schedule artifact generation or delivery.

## Evidence and limits

- Full suite: 443 tests across 73 files passed.
- New backend continuation suite: 19 cases. Operator UI includes a separate deliberate continuation test.
- Tested: identical final output, two saved answers/six remaining calls, immutable inputs after source changes, original deadline and retry preservation, no duplicate stage records/evidence, stale worker rejection, one ticket consumer, anonymous/foreign denial, stale review tokens, changed request contracts, pending/failed/missing/ambiguous results, expired/exhausted bounds, later handoffs, active tick claims, open incidents, changed authorization/dependencies and lost resource reservations.
- Managed Testing deployment accepted the additive contract as backward-compatible. No production records were experimentally changed and no real provider inference/dispatch was invoked for the comparison.
- Still unverified: real host termination, network interruption during an actual successful provider call, cloud interruption recovery and long-horizon repeated reliability. These operational acceptance checks resumed on October 17; managed-host/provider-network failure still requires supported fault controls.
- A genuinely pending remote call cannot safely be replayed from an assumption of failure. No automatic claim expiry, arbitrary reservation reset or exactly-once claim is introduced.
- Retired claims and copied receipts increase audit retention; long-term retention remains an operating-policy task.

This closes the implemented gap for reviewed continuation of successful saved stages plus unstarted stages. Other unfinished product engineering—AI multimodal generation/perception, shared mission execution, external-agent runtime, automatic source-specific outcomes and broader adaptive learning—remains tracked on Master Roadmap.
