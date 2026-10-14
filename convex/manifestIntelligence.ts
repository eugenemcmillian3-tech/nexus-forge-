import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { callManagedAi } from "./providerAccounting";
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

// Reuse Research Oracle's existing saved records as source-backed context.
// Ownership is resolved through the mission owner index; no cross-operator
// research rows are returned and no generated summary is relabeled as a source.
export const listResearchEvidence = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("research"),
    missionTitle: v.string(),
    query: v.string(),
    result: v.string(),
    citations: v.array(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const operatorId = await getAuthUserId(ctx);
    if (!operatorId) return [];
    const missions = await ctx.db.query("missions")
      .withIndex("by_owner", q => q.eq("ownerKey", operatorId))
      .order("desc")
      .take(30);
    const records = await Promise.all(missions.map(async mission => {
      const rows = await ctx.db.query("research")
        .withIndex("by_mission", q => q.eq("missionId", mission._id))
        .order("desc")
        .take(5);
      return rows.map(row => ({
        _id: row._id,
        missionTitle: mission.title,
        query: row.query,
        result: row.result,
        citations: row.citations.filter(url => /^https:\/\//i.test(url)),
        createdAt: row.createdAt,
      }));
    }));
    return records.flat().sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
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

export const attachAssumptionEvidence = mutation({
  args: {
    strategyId: v.id("memories"),
    evidenceType: v.union(v.literal("supports"), v.literal("contradicts"), v.literal("inconclusive")),
    url: v.string(),
    note: v.string(),
    sourcePublishedDate: v.optional(v.string()),
    sourceAuthority: v.union(v.literal("official_primary"), v.literal("peer_reviewed"), v.literal("reputable_reporting"), v.literal("industry_source"), v.literal("other")),
    relevance: v.string(),
    claimMatch: v.union(v.literal("matches_claim"), v.literal("partially_matches"), v.literal("does_not_match"), v.literal("not_reviewed")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operatorId = await getAuthUserId(ctx);
    if (!operatorId) throw new Error("Authenticated operator session required");
    const row = await ctx.db.get(args.strategyId);
    if (!row || row.ownerKey !== operatorId || row.category !== "manifest-strategy") throw new Error("Strategy record not found or access denied");
    const url = args.url.trim();
    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch { throw new Error("Enter a valid HTTPS source URL."); }
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname || parsedUrl.username || parsedUrl.password || parsedUrl.hostname.endsWith(".local") || parsedUrl.hostname === "localhost") {
      throw new Error("Evidence links must be public HTTPS URLs without embedded credentials.");
    }
    const note = args.note.trim().slice(0, 1000);
    if (note.length < 3) throw new Error("Describe how this source relates to the assumption.");
    const relevance = args.relevance.trim().slice(0, 1000);
    if (relevance.length < 3) throw new Error("Describe why the source is relevant to this specific claim.");
    const sourcePublishedDate = args.sourcePublishedDate?.trim();
    if (sourcePublishedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(sourcePublishedDate) || Number.isNaN(Date.parse(sourcePublishedDate)) || new Date(sourcePublishedDate).toISOString().slice(0, 10) !== sourcePublishedDate)) {
      throw new Error("Source publication date must be a real date in YYYY-MM-DD format.");
    }
    let strategy: Record<string, unknown>;
    try { strategy = JSON.parse(row.value) as Record<string, unknown>; } catch { throw new Error("Stored strategy record is invalid; evidence was not saved."); }
    const existing = Array.isArray(strategy.assumptionEvidence)
      ? strategy.assumptionEvidence.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      : [];
    const evidence = {
      evidenceType: args.evidenceType,
      url,
      note,
      sourcePublishedDate: sourcePublishedDate || null,
      sourceAuthority: args.sourceAuthority,
      relevance,
      claimMatch: args.claimMatch,
      reviewedAt: Date.now(),
      addedAt: Date.now(),
    };
    await ctx.db.patch(row._id, {
      value: JSON.stringify({ ...strategy, assumptionEvidence: [...existing, evidence].slice(-30) }),
    });
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
    if (args.actualCost !== undefined && (!Number.isFinite(args.actualCost) || args.actualCost < 0 || args.actualCost > 1000000)) {
      throw new Error("Actual cost must be finite and between $0 and $1,000,000; invalid cost was not saved.");
    }
    const actualCost = args.actualCost;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(row.value) as Record<string, unknown>; } catch { throw new Error("Stored strategy record is invalid; outcome was not saved."); }
    const previousHistory = Array.isArray(parsed.outcomeHistory)
      ? parsed.outcomeHistory.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      : [];
    // Preserve legacy latest-outcome fields when the record predates outcomeHistory.
    if (previousHistory.length === 0 && typeof parsed.recordedAt === "number" && typeof parsed.actualResult === "string" && typeof parsed.evidence === "string") {
      previousHistory.push({
        outcomeStatus: parsed.outcomeStatus ?? "inconclusive",
        actualResult: parsed.actualResult,
        evidence: parsed.evidence,
        actualCost: typeof parsed.actualCost === "number" && Number.isFinite(parsed.actualCost) ? parsed.actualCost : null,
        recordedAt: parsed.recordedAt,
      });
    }
    const recordedAt = Date.now();
    const outcome = { outcomeStatus: args.outcomeStatus, actualResult, evidence, actualCost: actualCost ?? null, recordedAt };
    const outcomeHistory = [...previousHistory, outcome].slice(-20);
    await ctx.db.patch(row._id, { value: JSON.stringify({ ...parsed, ...outcome, outcomeHistory }), confidence: args.outcomeStatus === "inconclusive" ? 0.35 : 0.9, source: "manifest-intelligence-operator-measured-outcome" });
    return null;
  },
});

export const listProviderUsage = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("memories"),
    provider: v.string(),
    model: v.string(),
    promptTokens: v.union(v.number(), v.null()),
    completionTokens: v.union(v.number(), v.null()),
    totalTokens: v.union(v.number(), v.null()),
    reportedCostUsd: v.union(v.number(), v.null()),
    costStatus: v.string(),
    capturedAt: v.number(),
  })),
  handler: async (ctx) => {
    const operatorId = await getAuthUserId(ctx);
    if (!operatorId) return [];
    const rows = await ctx.db.query("memories")
      .withIndex("by_owner", q => q.eq("ownerKey", operatorId))
      .order("desc")
      .take(200);
    return rows.filter(row => row.category === "manifest-provider-usage").slice(0, 30).flatMap(row => {
      try {
        const parsed = JSON.parse(row.value) as Record<string, unknown>;
        const numberOrNull = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
        return [{
          _id: row._id,
          provider: typeof parsed.provider === "string" ? parsed.provider : "Unknown provider",
          model: typeof parsed.model === "string" ? parsed.model : "Unknown model",
          promptTokens: numberOrNull(parsed.promptTokens),
          completionTokens: numberOrNull(parsed.completionTokens),
          totalTokens: numberOrNull(parsed.totalTokens),
          reportedCostUsd: numberOrNull(parsed.reportedCostUsd),
          costStatus: parsed.costStatus === "provider-reported" ? "provider-reported" : "not-reported-by-provider",
          capturedAt: typeof parsed.capturedAt === "number" && Number.isFinite(parsed.capturedAt) ? parsed.capturedAt : row._creationTime,
        }];
      } catch {
        return [];
      }
    });
  },
});

export const recordProviderUsageInternal = internalMutation({
  args: {
    ownerKey: v.string(),
    invocationId: v.optional(v.id('providerInvocations')),
    reportOrdinal: v.optional(v.number()),
    provider: v.string(),
    model: v.string(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    reportedCostUsd: v.optional(v.number()),
    capturedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.ownerKey.trim() || args.ownerKey.length > 256) {
      throw new Error("Provider usage owner key is invalid.");
    }
    for (const [label, value] of [
      ["prompt tokens", args.promptTokens],
      ["completion tokens", args.completionTokens],
      ["total tokens", args.totalTokens],
    ] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > 100000000)) {
        throw new Error(`Provider-reported ${label} must be a finite, non-negative integer within the accepted range.`);
      }
    }
    if (args.reportedCostUsd !== undefined && (!Number.isFinite(args.reportedCostUsd) || args.reportedCostUsd < 0 || args.reportedCostUsd > 1000000)) {
      throw new Error("Provider-reported cost is outside the accepted range.");
    }
    if (!args.provider.trim() || args.provider.length > 80 || !args.model.trim() || args.model.length > 160) {
      throw new Error("Provider usage identity is invalid.");
    }
    if (!Number.isFinite(args.capturedAt) || args.capturedAt <= 0) {
      throw new Error("Provider usage capture timestamp is invalid.");
    }
    const invocation = args.invocationId ? await ctx.db.get(args.invocationId) : null;
    const report = { ordinal: args.reportOrdinal ?? 0, provider: args.provider, model: args.model, ...(args.promptTokens !== undefined ? { promptTokens: args.promptTokens } : {}), ...(args.completionTokens !== undefined ? { completionTokens: args.completionTokens } : {}), ...(args.totalTokens !== undefined ? { totalTokens: args.totalTokens } : {}), ...(args.reportedCostUsd !== undefined ? { reportedCostUsd: args.reportedCostUsd } : {}), capturedAt: args.capturedAt };
    if (args.invocationId) {
      if (!invocation || invocation.ownerKey !== args.ownerKey || !Number.isInteger(args.reportOrdinal) || args.reportOrdinal! < 1 || args.reportOrdinal! > 8) throw new Error("Invalid invocation receipt identity.");
      const existing = invocation.reports.find(item => item.ordinal === args.reportOrdinal);
      if (existing) {
        if ((['ordinal', 'provider', 'model', 'promptTokens', 'completionTokens', 'totalTokens', 'reportedCostUsd', 'capturedAt'] as const).some(key => existing[key] !== report[key])) throw new Error("Conflicting invocation receipt.");
        return null;
      }
      if (invocation.outcome !== "pending" || invocation.reports.length >= 8) throw new Error("Invocation receipt is closed or full.");
    } else if (args.reportOrdinal !== undefined) throw new Error("Report ordinal requires an invocation.");
    await ctx.db.insert("memories", {
      ownerKey: args.ownerKey,
      ...(invocation?.missionId ? { missionId: invocation.missionId } : {}),
      category: "manifest-provider-usage",
      key: `provider-usage:${args.capturedAt}:${args.provider}`,
      value: JSON.stringify({
        ...(args.invocationId ? { invocationId: args.invocationId, stage: invocation!.stage, reportOrdinal: args.reportOrdinal } : {}),
        provider: args.provider,
        model: args.model.slice(0, 160),
        promptTokens: args.promptTokens ?? null,
        completionTokens: args.completionTokens ?? null,
        totalTokens: args.totalTokens ?? null,
        reportedCostUsd: args.reportedCostUsd ?? null,
        costStatus: args.reportedCostUsd === undefined ? "not-reported-by-provider" : "provider-reported",
        capturedAt: args.capturedAt,
      }),
      confidence: args.reportedCostUsd === undefined ? 0.7 : 0.95,
      source: "ai-provider-response-usage-metadata",
    });
    if (invocation) await ctx.db.patch(invocation._id, { reports: [...invocation.reports, report] });
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
    const blueprintId = await ctx.db.insert("memories", {
      ownerKey: args.ownerKey,
      category: "manifest-blueprint",
      key: "manifest:pending",
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
    // Use the unique persisted ID so concurrent syntheses cannot share receipt keys.
    const blueprintKey = `manifest:${blueprintId}`;
    await ctx.db.patch(blueprintId, { key: blueprintKey });
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
  returns: v.object({ blueprint: v.string(), blueprintKey: v.string(), saved: v.boolean(), strategyCount: v.number(), strategyBlockValid: v.boolean() }),
  handler: async (ctx, args) => {
    const operatorId = await getAuthUserId(ctx);
    if (!operatorId) throw new Error("Authenticated operator session required");
    const intent = args.intent.trim().slice(0, 3000);
    if (intent.length < 12) throw new Error("Describe the outcome in at least 12 characters.");
    if (!Number.isFinite(args.budget)) throw new Error("Budget cap must be a finite number.");
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
    const generated = await callManagedAi(ctx, { ownerKey: operatorId, stage: "manifest-blueprint", role: "planner", prompt: structuredPrompt, maxTokens: 2400 });
    const extraction = extractManifestStrategies(generated);
    const blueprint = extraction.blueprint;
    let strategies = extraction.strategies;
    let strategyBlockValid = extraction.validJson;

    // Providers sometimes honor the blueprint request but omit the optional fenced
    // payload. Make one small, bounded structured-only retry; never let its failure
    // discard the readable blueprint or persist incomplete candidate objects.
    if (strategies.length === 0) {
      const strategyPrompt = `Extract exactly three distinct candidate strategies from the blueprint below. Return ONLY a JSON array, with no Markdown fences or commentary. Each object must contain non-empty string fields: name, mechanism, prerequisites, timeToEvidence, expectedValue, reversibility, failureMode, unverifiedAssumptions. Do not invent claims of execution, measured outcomes, verified costs, or available integrations. Preserve uncertainty in unverifiedAssumptions. If three genuinely distinct strategies cannot be supported by the blueprint, return an empty JSON array.\n\nUSER INTENT: ${intent}\nDOMAIN: ${domain}\nBUDGET CAP: $${budget} USD\nTIME HORIZON: ${horizon}\nCONSTRAINTS: ${constraints || 'Not supplied; identify unknowns.'}\nACCEPTANCE CRITERIA: ${acceptanceCriteria || 'Not supplied; label proposed criteria.'}\n\nBLUEPRINT:\n${blueprint.slice(0, 9000)}`;
      try {
        const structuredResponse = await callManagedAi(ctx, { ownerKey: operatorId, stage: "manifest-strategy", role: "planner", prompt: strategyPrompt, maxTokens: 1400 });
        const retry = extractManifestStrategies(structuredResponse);
        if (retry.validJson && retry.strategies.length === 3) {
          strategies = retry.strategies;
          strategyBlockValid = true;
        }
      } catch (error) {
        console.warn("Manifest strategy structured retry failed; preserving blueprint without ledger records.", error instanceof Error ? error.message : String(error));
      }
    }

    const blueprintKey = await ctx.runMutation(internal.manifestIntelligence.saveBlueprint, {
      ownerKey: operatorId, intent, domain, budget, horizon, constraints,
      acceptanceCriteria, blueprint,
    });
    if (strategies.length > 0) {
      await ctx.runMutation(internal.manifestIntelligence.saveStrategies, { ownerKey: operatorId, blueprintKey, strategies });
    }
    return { blueprint, blueprintKey, saved: true, strategyCount: strategies.length, strategyBlockValid };
  },
});
