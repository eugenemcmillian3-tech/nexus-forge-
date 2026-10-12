import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { callAiProvider } from "./aiProvider";
import { extractManifestStrategies } from "./manifestStrategyParser";

const blueprintShape = v.object({
  _id: v.id("memories"),
  _creationTime: v.number(),
  key: v.string(),
  value: v.string(),
  confidence: v.number(),
  source: v.string(),
});

export const listBlueprints = query({
  args: {},
  returns: v.array(blueprintShape),
  handler: async (ctx) => {
    const operatorId = await getAuthUserId(ctx);
    // Routes may mount their query while the auth wrapper is still resolving. Return
    // an empty private history until a session exists instead of crashing the page.
    if (!operatorId) return [];
    const rows = await ctx.db.query("memories")
      .withIndex("by_owner", q => q.eq("ownerKey", operatorId))
      .order("desc")
      .take(40);
    return rows
      .filter(row => row.category === "manifest-blueprint")
      .slice(0, 8)
      .map(({ _id, _creationTime, key, value, confidence, source }) => ({ _id, _creationTime, key, value, confidence, source }));
  },
});

const strategyShape = v.object({
  name: v.string(), mechanism: v.string(), prerequisites: v.string(),
  timeToEvidence: v.string(), expectedValue: v.string(), reversibility: v.string(),
  failureMode: v.string(), unverifiedAssumptions: v.string(),
});

export const listStrategies = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("memories"), _creationTime: v.number(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() })),
  handler: async (ctx) => {
    const operatorId = await getAuthUserId(ctx);
    if (!operatorId) return [];
    const rows = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", operatorId)).order("desc").take(100);
    return rows.filter(row => row.category === "manifest-strategy").slice(0, 30).map(({ _id, _creationTime, key, value, confidence, source }) => ({ _id, _creationTime, key, value, confidence, source }));
  },
});

export const saveStrategies = internalMutation({
  args: { ownerKey: v.string(), blueprintKey: v.string(), strategies: v.array(strategyShape) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const [index, strategy] of args.strategies.entries()) {
      await ctx.db.insert("memories", { ownerKey: args.ownerKey, category: "manifest-strategy", key: args.blueprintKey + ":strategy:" + (index + 1), value: JSON.stringify({ ...strategy, outcomeStatus: "not_measured", actualResult: "", evidence: "", actualCost: null, recordedAt: null }), confidence: 0.5, source: "manifest-intelligence-structured-proposal" });
    }
    return null;
  },
});

export const recordStrategyOutcome = mutation({
  args: { strategyId: v.id("memories"), outcomeStatus: v.union(v.literal("succeeded"), v.literal("partial"), v.literal("failed"), v.literal("inconclusive")), actualResult: v.string(), evidence: v.string(), actualCost: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operatorId = await getAuthUserId(ctx);
    if (!operatorId) throw new Error("Authenticated operator session required");
    const row = await ctx.db.get(args.strategyId);
    if (!row || row.ownerKey !== operatorId || row.category !== "manifest-strategy") throw new Error("Strategy record not found or access denied");
    const actualResult = args.actualResult.trim().slice(0, 2000);
    const evidence = args.evidence.trim().slice(0, 3000);
    if (actualResult.length < 3) throw new Error("Enter the observed result, not an expected result.");
    if (evidence.length < 3) throw new Error("Add evidence or a specific measurement source.");
    const actualCost = args.actualCost === undefined ? undefined : Math.max(0, Math.min(1000000, args.actualCost));
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(row.value) as Record<string, unknown>; } catch { throw new Error("Stored strategy record is invalid; outcome was not saved."); }
    await ctx.db.patch(row._id, { value: JSON.stringify({ ...parsed, outcomeStatus: args.outcomeStatus, actualResult, evidence, actualCost: actualCost ?? null, recordedAt: Date.now() }), confidence: args.outcomeStatus === "inconclusive" ? 0.35 : 0.9, source: "manifest-intelligence-operator-measured-outcome" });
    return null;
  },
});

export const saveBlueprint = internalMutation({
  args: {
    ownerKey: v.string(),
    intent: v.string(),
    domain: v.string(),
    budget: v.number(),
    horizon: v.string(),
    constraints: v.optional(v.string()),
    acceptanceCriteria: v.optional(v.string()),
    blueprint: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const blueprintKey = `manifest:${Date.now()}`;
    await ctx.db.insert("memories", {
      ownerKey: args.ownerKey,
      category: "manifest-blueprint",
      key: blueprintKey,
      value: JSON.stringify({
        intent: args.intent,
        domain: args.domain,
        budget: args.budget,
        horizon: args.horizon,
        constraints: args.constraints ?? '',
        acceptanceCriteria: args.acceptanceCriteria ?? '',
        blueprint: args.blueprint,
      }),
      confidence: 0.75,
      source: "manifest-intelligence-ai-draft",
    });
    return blueprintKey;
  },
});

export const synthesize = action({
  args: {
    intent: v.string(),
    domain: v.string(),
    budget: v.number(),
    horizon: v.string(),
    constraints: v.optional(v.string()),
    acceptanceCriteria: v.optional(v.string()),
  },
  returns: v.object({ blueprint: v.string(), saved: v.boolean() }),
  handler: async (ctx, args) => {
    const operatorId = await getAuthUserId(ctx);
    if (!operatorId) throw new Error("Authenticated operator session required");
    const intent = args.intent.trim().slice(0, 3000);
    if (intent.length < 12) throw new Error("Describe the outcome in at least 12 characters.");
    const budget = Math.max(0, Math.min(500, Math.round(args.budget)));
    const horizon = args.horizon.slice(0, 80);
    const domain = args.domain.slice(0, 100);
    const constraints = (args.constraints ?? '').trim().slice(0, 2000);
    const acceptanceCriteria = (args.acceptanceCriteria ?? '').trim().slice(0, 2000);
    const prompt = `You are Manifest Intelligence inside NEXUS FORGE: an outcome-oriented synthesis engine that combines generative creation, long-horizon systems thinking, general-purpose task decomposition, and specialist-agent critique into one practical plan. This is a product design framework, not a claim that the system is AGI, a singularity, or superintelligent.

Create a concise, original, execution-ready blueprint from the user's intent. Distinguish established facts from hypotheses. Prefer low-cost, testable steps. Never promise guaranteed revenue, sentience, AGI, or scientific breakthroughs. Keep humans in control of consequential actions. Do not assume tools, integrations, or model capabilities that have not been verified. Do not recommend providers, API products, or paid/free tiers as available unless they are listed in the configured NEXUS FORGE provider set or explicitly marked as options to verify. Avoid claiming any service has a free tier or that a deployment happened unless verified. Prefer the user's existing stack and current configured providers; clearly label any proposed external dependency.

Return these exact headings in Markdown:
## Manifest
Turn the intent into a tangible artifact or measurable outcome.
## Four-way synthesis
Explain how generative creation, compounding improvement, cross-domain generality, and specialist intelligence work together in this plan.
## Candidate strategies
Propose three meaningfully different approaches, not superficial variations. For each, state the core mechanism, prerequisites, time-to-first-evidence, expected value, reversibility, and main failure mode. Identify which assumptions are unverified.
## Decision scorecard
Compare the three approaches on goal fit, evidence strength, delivery risk, time, and total estimated cost. Use a 1–5 scale with a short rationale for each score; define whether higher is better. Keep estimated costs separate from actual measured spend, show the arithmetic or assumptions behind estimates, and never imply a tool/provider price is verified unless it is configured and known. Recommend one approach and explain the trade-off; if evidence is insufficient, recommend the smallest experiment instead of false precision.
## System design
Describe the key components and how information flows between them.
## First experiment
Give one small experiment that can distinguish between the leading approaches, acceptance criteria, a clear pass/fail test, and the evidence to capture.
## Execution sequence
List 5–7 ordered steps, identifying which outputs require independent verification.
## Risks and guardrails
Name key failure modes, privacy/security concerns, and human approval points.
## Success metrics
Give 3–5 measurable metrics and how each is measured, including a baseline and decision threshold where practical.
## Novelty hypothesis
State what could be differentiated and how to validate that claim against existing products; do not assert that no one else has built it.
## Next action
Give the single most useful action to take first.

USER INTENT:
${intent}

DOMAIN: ${domain}
BUDGET CAP: $ ${budget} USD
TIME HORIZON: ${horizon}

Write specific, realistic guidance tailored to the intent. Do not describe the blueprint as completed work; it is a proposal until executed and verified.`;
    const structuredPrompt = `${prompt}\n\nMISSION SPECIFICATION REQUIREMENTS:\n- Constraints and operator assumptions: ${constraints || "Not supplied; identify unknowns instead of inventing constraints."}\n- Required acceptance criteria: ${acceptanceCriteria || "Not supplied; propose measurable criteria and label them as proposals for operator review."}\n- Explicitly identify goal, deliverable, target user, dependencies, permitted tools/resources, risk level, required human approvals, and rollback/stop conditions.\n- If an essential requirement is missing, state the gap and ask a focused clarification question rather than inventing facts.` + "\n\nAppend a fenced JSON block labelled manifest-strategies with three objects containing string fields name, mechanism, prerequisites, timeToEvidence, expectedValue, reversibility, failureMode, unverifiedAssumptions. Keep the blueprint Markdown before it readable. Do not claim execution.";
    const generated = await callAiProvider("planner", structuredPrompt, 2400);
    const extraction = extractManifestStrategies(generated);
    const blueprint = extraction.blueprint;
    const strategies = extraction.strategies;
    const blueprintKey = await ctx.runMutation(internal.manifestIntelligence.saveBlueprint, {
      ownerKey: operatorId,
      intent,
      domain,
      budget,
      horizon,
      constraints,
      acceptanceCriteria,
      blueprint,
    });
    if (strategies.length > 0) await ctx.runMutation(internal.manifestIntelligence.saveStrategies, { ownerKey: operatorId, blueprintKey, strategies });
    return { blueprint, saved: true };
  },
});
