import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const metric = v.object({
  key: v.string(),
  label: v.string(),
  baseline: v.number(),
  candidate: v.number(),
  unit: v.string(),
  direction: v.union(v.literal("higher"), v.literal("lower")),
  evidence: v.string(),
});
const experimentShape = v.object({
  _id: v.id("memories"),
  _creationTime: v.number(),
  key: v.string(),
  value: v.string(),
  confidence: v.number(),
  source: v.string(),
});

export const listExperiments = query({
  args: {},
  returns: v.array(experimentShape),
  handler: async (ctx) => {
    const ownerKey = await getAuthUserId(ctx);
    if (!ownerKey) return [];
    const rows = await ctx.db.query("memories")
      .withIndex("by_owner", q => q.eq("ownerKey", ownerKey))
      .order("desc")
      .take(100);
    return rows.filter(row => row.category === "learning-experiment").slice(0, 12)
      .map(({ _id, _creationTime, key, value, confidence, source }) => ({ _id, _creationTime, key, value, confidence, source }));
  },
});

export const recordExperiment = mutation({
  args: {
    name: v.string(),
    hypothesis: v.string(),
    manifestStrategyId: v.optional(v.id("memories")),
    baselineLabel: v.string(),
    candidateLabel: v.string(),
    metrics: v.array(metric),
    baselineSafetyPass: v.boolean(),
    candidateSafetyPass: v.boolean(),
    notes: v.string(),
  },
  returns: v.object({
    saved: v.boolean(),
    decision: v.string(),
    improved: v.number(),
    regressed: v.number(),
    unchanged: v.number(),
    rationale: v.string(),
  }),
  handler: async (ctx, args) => {
    const ownerKey = await getAuthUserId(ctx);
    if (!ownerKey) throw new Error("Authenticated operator session required.");
    const name = args.name.trim().slice(0, 120);
    const hypothesis = args.hypothesis.trim().slice(0, 1200);
    let linkedManifestStrategy: { id: string; name: string } | null = null;
    if (args.manifestStrategyId) {
      const strategy = await ctx.db.get(args.manifestStrategyId);
      if (!strategy || strategy.ownerKey !== ownerKey || strategy.category !== "manifest-strategy") {
        throw new Error("Selected Manifest strategy was not found in your private strategy ledger.");
      }
      let parsed: { name?: string } = {};
      try { parsed = JSON.parse(strategy.value) as { name?: string }; } catch { /* Keep the ledger key as a safe fallback. */ }
      linkedManifestStrategy = { id: strategy._id, name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim().slice(0, 160) : strategy.key.slice(0, 160) };
    }
    if (name.length < 3) throw new Error("Experiment name must contain at least 3 characters.");
    if (hypothesis.length < 8) throw new Error("Enter a testable hypothesis.");
    if (args.metrics.length < 2 || args.metrics.length > 8) throw new Error("Record 2–8 comparable metrics.");
    const seen = new Set<string>();
    for (const item of args.metrics) {
      if (seen.has(item.key)) throw new Error("Metric keys must be unique.");
      seen.add(item.key);
      if (!item.label.trim() || !item.unit.trim()) throw new Error("Each metric needs a label and unit.");
      if (!Number.isFinite(item.baseline) || !Number.isFinite(item.candidate)) throw new Error("Metric values must be finite numbers.");
      if (item.evidence.trim().length < 8) throw new Error(`Add an evidence reference or explain how you measured: ${item.label}.`);
    }
    const results = args.metrics.map(item => {
      const delta = item.candidate - item.baseline;
      const normalized = item.direction === "higher" ? delta : -delta;
      const status = Math.abs(normalized) < 0.000001 ? "unchanged" : normalized > 0 ? "improved" : "regressed";
      return { ...item, delta, status };
    });
    const improved = results.filter(x => x.status === "improved").length;
    const regressed = results.filter(x => x.status === "regressed").length;
    const unchanged = results.filter(x => x.status === "unchanged").length;
    let decision = "inconclusive";
    let rationale = "Results do not yet show a sufficiently consistent improvement. Collect more comparable measurements and rerun.";
    if (!args.baselineSafetyPass || !args.candidateSafetyPass) {
      decision = "do-not-promote";
      rationale = "Safety checks did not pass for both baseline and candidate. Do not promote this candidate.";
    } else if (improved >= 2 && regressed === 0) {
      decision = "human-review-recommended";
      rationale = "At least two metrics improved, none regressed, and both safety checks were marked as passed. This is a recommendation for human review, not automatic promotion.";
    } else if (regressed > 0) {
      decision = "do-not-promote";
      rationale = "One or more measured metrics regressed. Investigate the trade-off before considering this candidate.";
    }
    const record = {
      name,
      hypothesis,
      linkedManifestStrategy,
      baselineLabel: args.baselineLabel.trim().slice(0, 100),
      candidateLabel: args.candidateLabel.trim().slice(0, 100),
      metrics: results,
      baselineSafetyPass: args.baselineSafetyPass,
      candidateSafetyPass: args.candidateSafetyPass,
      notes: args.notes.trim().slice(0, 2000),
      decision,
      rationale,
      counts: { improved, regressed, unchanged },
      evidenceStatus: "operator-provided; not independently verified",
      recordedAt: Date.now(),
      promotionApplied: false,
    };
    await ctx.db.insert("memories", {
      ownerKey,
      category: "learning-experiment",
      key: `learning-experiment:${Date.now()}:${name.slice(0, 40)}`,
      value: JSON.stringify(record),
      confidence: 0.5,
      source: "governed-baseline-candidate-comparison",
    });
    return { saved: true, decision, improved, regressed, unchanged, rationale };
  },
});
