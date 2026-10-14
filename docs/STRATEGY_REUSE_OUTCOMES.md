# Reviewed lesson reuse outcome comparisons — 2026-10-14

Verified Learning Engine now links a reviewed lesson's mission-draft handoff to a subsequent measurement and an earlier baseline measurement. This fills the gap between a saved lesson, its linked Manifest strategy, and later measured observations. It adds no workspace.

## Guided use

1. Save a reviewed lesson linked to an owned Manifest strategy, with applicability and evidence references.
2. Use the existing reviewed-lesson handoff to create a new mission draft. This records a mission-source receipt. A draft is provenance, not proof of actual application.
3. Apply the lesson to the new mission and record its runtime cost, governed delivery-readiness measurement or product observation through the existing workflow.
4. On Verified Learning Engine, select that active mission, evidence type, linked lesson, different baseline mission, and baseline/candidate receipts. The baseline measurement must predate the handoff; the candidate must follow it.
5. Describe actual application and comparable conditions, explicitly confirm them, then save the observed comparison.
6. Inspect the retained lesson, strategy, handoff, measurement snapshots, delta and outcome. Continue to Workflow for additional measurement records.

Selectors show up to 50 recent owned missions and the latest 20 measurements per selected mission. History shows the latest 20 private comparisons.

## Comparison rules

The backend reads source records; the client supplies references and application notes, never claimed numeric outcomes.

- Owned reviewed learning lesson, owned Manifest strategy and matching mission-source link are required.
- The candidate belongs to the reuse mission; the baseline belongs to a different owned mission.
- Measurement creation times enforce baseline before handoff and candidate after handoff.
- Metric, unit and target must match. Finite values and nonempty evidence are required.
- Supported measurement metrics: actual runtime cost (lower is better), governed delivery readiness (higher is better). The product evidence mode supports all five structured Portfolio observation types.
- Improvement, regression and unchanged are computed from signed delta with a 0.000001 equality tolerance.
- Matching lesson + baseline + candidate saves return the original immutable receipt, including its original application notes.
- No approval, mission completion, delivery dispatch or strategy promotion is changed.

Runtime costs and application/comparability judgments are operator-recorded. Governed readiness describes delivery-evidence domains; it is not a business metric. Historical snapshots retain at most eight evidence entries of 1000 characters each. They remain unchanged if original measurements later change.

Generic memory writes cannot fabricate the reserved mission-source or strategy-reuse-comparison categories. Comparison records are excluded before sampling advisory learning and adaptive-preflight context, so evaluation logs do not displace useful lessons.

## Interpretation

The result is an observed association between a lesson handoff, operator-attested application and subsequent measurements. Differences in tasks, providers, conditions or selection can explain a change. This does not establish causation, independently verify spend, certify business results or automatically promote strategies.

Next: representative repeated comparisons, authenticated product evidence ingestion and actual Council retrieval evaluation. Roadmap learning and real-world outcome milestones remain partial.

## Validation

Controlled tests use real mission creation, reviewed lesson capture, source attachment and runtime-cost recording functions. They check lower-cost improvement, regressions, unchanged outcomes, retained snapshots, idempotence, unchanged approval, private histories, absent handoffs, missing application attestation, incompatible metrics/targets, later baselines and foreign ownership. UI tests cover reference-only submission, attestation, guided handoff recovery and preserved drafts after rejection. These tests do not claim a real user's strategy has already improved a product outcome.

## Product observation comparison extension

Choose **Product / business observations** as the evidence type. Product records must have the same metric, unit, direction, target, exact saved measurement method text, sample size and observation duration. Baseline record creation and period end must precede the lesson handoff. The candidate period must start at or after handoff, and its record must be created afterward. Completed-period validation is rerun on both source observations. Equal durations mean equal elapsed milliseconds, not merely matching calendar labels.

Actual values are recomputed from original observations (including task success counts/sample sizes). The immutable strategy-reuse-product-v1 receipt retains both complete bounded product snapshots, the lesson/strategy/source receipt, explicit application/comparability attestation, signed delta and improvement/regression/unchanged classification. Existing strategy-reuse-v1 measurement receipts remain readable. History remains the latest 20 private comparison receipts across both evidence types.

Matching saved method text and samples are necessary checks, not proof that cohorts or tasks were equivalent. The operator must still review that comparability. Product observations remain operator-recorded; comparison does not independently verify revenue or establish causal strategy effectiveness. Matching lesson/product receipt pairs reuse the original comparison receipt. Cost/readiness and product APIs remain separate, and switching evidence type clears selected receipt IDs and application attestation.

Additional controlled tests exercise actual product recording and lesson handoff flows, recomputed rates, lower-is-better task time, retained regressions, incompatible conditions, pre-handoff candidate periods, private ownership and explicit product endpoint selection. No real operator product outcomes are fabricated by these tests.
