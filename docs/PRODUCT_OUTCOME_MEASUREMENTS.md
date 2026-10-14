# Structured product and business observations — 2026-10-14

Portfolio Intelligence now records mission-linked product/business observations separately from delivery verification, cost measurements and narrative Manifest strategy outcomes. The platform still has 16 feature pages.

## Guided sequence

1. Select the mission whose product/experiment was observed.
2. Open Portfolio Intelligence → Product & Business Outcomes → Record an observation.
3. Choose active users, paying customers, USD revenue, task success rate or task completion time.
4. Enter observed value, target, sample size, completed observation period, metric definition/method and 1–8 distinct evidence references. State limitations.
5. Save and inspect the private receipt and reported target comparison. Browse selected-mission or all-owned history with pagination.
6. Continue to Verified Learning Engine for comparison review. Product observations are not yet supported by the lesson-reuse comparison selector, which still compares cost/readiness only.

## Metric contracts

- Active users/paying customers: whole observed counts and targets, with observed count no greater than sampled population. Define active/paid, uniqueness and population consistently.
- Revenue: nonnegative USD observation and target. Sample size is included transactions/events. Explain gross/net treatment and refunds in the method. This is recorded evidence, not financial advice or an independently verified ledger.
- Task success: enter successful task count and total attempts as sample size; the backend computes percentage. Success count must be integral and within sample, and target must be 0–100%.
- Task time: nonnegative seconds summary and target, with aggregation method specified by the operator; lower is better. Sample size is measured tasks.

All values/dates must be finite. Sample size must be integral from 1 to 1 billion. Observed values/targets are bounded from zero to 1 trillion. Period end must follow start and not be in the future. UI datetime fields use the operator's local timezone; storage uses epoch timestamps. Methods require 12–1600 characters; references are distinct, 8–1000 characters each, and limitations are bounded.

The backend derives actual rate, unit, direction, target comparison, authenticated owner, recording time and operator-recorded provenance. The client cannot provide a claimed target status or another owner. Target met/not met is reported as an operator observation, not mission success.

## Storage and evidence

Append-only productOutcomes records retain raw observation, sample, period, metric/target, method, references, limitations and derived comparison. Indexes support owner-private and owned-mission pagination. References are stored as text and are not fetched, certified or automatically ingested. Repeated submissions create additional observations; corrections can be recorded as new observations with explanatory notes.

Product outcomes do not write to the existing measurements table, alter delivery-readiness interpretation, complete/approve missions, promote strategies or dispatch anything. Empty history remains missing evidence, never a pass.

## Validation and next work

Controlled tests check server-derived rates, lower-is-better outcomes, unmet targets, private scope, pagination, future/invalid periods, impossible samples, finite values and distinct evidence. UI tests verify explicit reference/input submission and preserved drafts after rejected observations. These tests do not claim any real business results were entered or verified.

Next: connect comparable product observations to strategy reuse, add authenticated evidence ingestion where supported, and evaluate representative real outcomes. Roadmap learning, outcome and capability milestones remain partial.
