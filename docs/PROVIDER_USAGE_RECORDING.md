# Provider usage recording and fallback

The shared managed AI router keeps accounting persistence separate from provider failover. A successful answer remains available if its usage recorder rejects; a bounded generic server warning notes that accounting may be incomplete. It does not include the recorder exception, response body, prompt or credentials. A failed accounting write is not retried automatically and does not request another inference.

Council, Research and Artifact generation use this shared policy instead of swallowing recorder failures locally. Manifest generation also receives the same protection. Actual provider HTTP/network/JSON/empty-answer failures continue through the existing configured fallback order. An empty answer may therefore trigger fallback even if its usage was recorded; recording a charge is not proof of a usable response.

## Measurement rules

Only finite nonnegative integer token counts up to 100,000,000 and finite nonnegative provider-reported USD charges up to 1,000,000 are retained, matching the existing receipt validator. Numeric strings, fractions, negative and oversized token counts are ignored. Prompt/input and completion/output aliases remain supported.

A valid explicit total is preserved. Without one, a total is derived only if both valid components exist and their sum is in range. A missing component is unknown, not zero. Total-only responses are recorded. Missing charges remain unknown; explicit provider-reported zero charges are retained without inferring free billing.

A bounded nonempty response model identity is preferred to the requested model identifier; the request identity is the fallback when the response omits a usable model name. Usage remains provider-reported metadata, not independently reconciled billing or complete mission resource accounting.

## Validation and remaining work

Controlled network tests verify one inference request when recording fails, a retained answer and bounded diagnostic, total-only metadata, incomplete components, aliases, zero charges, invalid metadata and continuing fallback for genuinely unusable answers. No new live provider calls or authentication exercises are needed for this repair.

The existing automatic providers and deferred-provider choices remain unchanged. The cost/resource milestone stays partial: complete per-run attribution, persistence-gap recovery, billing reconciliation and broader resource accounting are still open. Existing receipts are not rewritten or treated as complete billing history.
