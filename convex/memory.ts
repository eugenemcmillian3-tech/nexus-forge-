import { paginationOptsValidator, paginationResultValidator } from "convex/server"
import { v } from "convex/values"
import { mutation, query, internalQuery, internalMutation } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import { requireOperator, requireOwnedMission } from "./permissions"

const memoryValidator = v.object({ _id: v.id("memories"), _creationTime: v.number(), ownerKey: v.string(), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() })
const signal = v.object({ value: v.string(), confidence: v.number(), source: v.string() })
const preflight = v.object({ missionId: v.id("missions"), riskSignals: v.array(signal), reusePatterns: v.array(signal), requiredEvidence: v.array(v.string()), recoveryGuidance: v.array(v.string()), rationale: v.array(v.string()) })

function buildPreflight(missionId: any, rows: any[]) {
  const failures = rows.filter(row => row.category === "verification-outcome" && /fail|blocked|risk|not ready/i.test(row.value)).slice(0, 6)
  const recovery = rows.filter(row => row.category === "operational-recovery").slice(0, 6)
  const successes = rows.filter(row => row.category === "verification-outcome" && /pass|success|verified|complete/i.test(row.value)).slice(0, 6)
  const lessons = rows.filter(row => row.category === "learning-lesson").slice(0, 8)
  const riskSignals = failures.map(row => ({ value: row.value, confidence: row.confidence, source: row.source }))
  const reusePatterns = [...successes, ...lessons].slice(0, 10).map(row => ({ value: row.value, confidence: row.confidence, source: row.source }))
  const requiredEvidence = ["Explicit acceptance criteria", "Build/test evidence", "Human approval evidence", "Final outcome verification"]
  if (riskSignals.length) requiredEvidence.push("Evidence addressing previously observed failure/risk patterns")
  const recoveryGuidance = recovery.length ? recovery.map(row => row.value) : ["Keep retries bounded and escalate repeated failures to human review."]
  const rationale = riskSignals.length ? ["Prior failures or risk signals require stronger preflight evidence.", "Historical recovery patterns are available for bounded remediation."] : reusePatterns.length ? ["Verified historical outcomes provide reusable patterns for this mission."] : ["No relevant verified history is available; treat assumptions as unverified."]
  return { missionId, riskSignals, reusePatterns, requiredEvidence, recoveryGuidance, rationale }
}

export const list = query({
  args: { ownerKey: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(memoryValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new ConvexError("Authenticated operator session required")
    return ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", userId)).order("desc").paginate(args.paginationOpts)
  },
})

export const getMissionSynthesis = internalQuery({
  args: { missionId: v.id("missions") },
  returns: v.union(v.object({ value: v.string(), confidence: v.number(), source: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const mission = await ctx.db.get("missions", args.missionId)
    if (!mission) return null
    const row = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", mission.ownerKey)).filter(q => q.and(q.eq(q.field("missionId"), args.missionId), q.eq(q.field("category"), "research-synthesis"))).order("desc").first()
    return row ? { value: row.value, confidence: row.confidence, source: row.source } : null
  },
})

export const getLearningContext = internalQuery({
  args: { missionId: v.id("missions") },
  returns: v.object({ ownerKey: v.string(), outcomes: v.array(signal), lessons: v.array(signal) }),
  handler: async (ctx, args) => {
    const mission = await ctx.db.get("missions", args.missionId)
    if (!mission) throw new Error("Mission not found")
    const rows = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", mission.ownerKey)).order("desc").take(60)
    const outcomes = rows.filter(row => row.category === "verification-outcome").slice(0, 10).map(row => ({ value: row.value, confidence: row.confidence, source: row.source }))
    const lessons = rows.filter(row => row.category === "learning-lesson" || row.category === "operational-recovery").slice(0, 10).map(row => ({ value: row.value, confidence: row.confidence, source: row.source }))
    return { ownerKey: mission.ownerKey, outcomes, lessons }
  },
})

export const getAdaptivePreflight = internalQuery({
  args: { missionId: v.id("missions") }, returns: preflight,
  handler: async (ctx, args) => {
    const mission = await ctx.db.get("missions", args.missionId)
    if (!mission) throw new Error("Mission not found")
    const rows = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", mission.ownerKey)).order("desc").take(80)
    return buildPreflight(args.missionId, rows)
  },
})

export const getAdaptivePreflightForOperator = query({
  args: { missionId: v.id("missions") }, returns: preflight,
  handler: async (ctx, args) => {
    const mission = await requireOwnedMission(ctx, args.missionId)
    const rows = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", mission.ownerKey)).order("desc").take(80)
    return buildPreflight(args.missionId, rows)
  },
})

export const remember = mutation({
  args: { ownerKey: v.optional(v.string()), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() },
  returns: v.id("memories"),
  handler: async (ctx, args) => {
    const userId = await requireOperator(ctx)
    const mission = args.missionId ? await requireOwnedMission(ctx, args.missionId) : null
    const ownerKey = mission?.ownerKey ?? userId
    return ctx.db.insert("memories", { ...args, ownerKey, confidence: Math.max(0, Math.min(1, args.confidence)) })
  },
})

export const rememberInternal = internalMutation({
  args: { ownerKey: v.string(), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() },
  returns: v.id("memories"),
  handler: async (ctx, args) => ctx.db.insert("memories", { ...args, confidence: Math.max(0, Math.min(1, args.confidence)) }),
})

export const captureVerificationLesson = internalMutation({
  args: {
    ownerKey: v.string(),
    missionId: v.id("missions"),
    score: v.number(),
    passed: v.boolean(),
    metric: v.string(),
    criteria: v.array(v.string()),
  },
  returns: v.id("memories"),
  handler: async (ctx, args) => {
    const status = args.passed ? "passed" : "needs review"
    const value = JSON.stringify({
      lesson: `Governed delivery measurement ${status}: ${Math.round(args.score * 100)}% on ${args.metric}.`,
      score: args.score,
      metric: args.metric,
      criteria: args.criteria,
      reusableRule: args.passed
        ? "Reuse the four-domain evidence pattern, but keep human approval before execution and completion."
        : "Strengthen the failed evidence domains and require human review before treating the mission as complete.",
    })
    return await ctx.db.insert("memories", {
      ownerKey: args.ownerKey,
      missionId: args.missionId,
      category: "learning-lesson",
      key: `measurement:${args.metric}:${args.missionId}`,
      value,
      confidence: Math.max(0, Math.min(1, args.score)),
      source: "verified-measurement",
    })
  },
})
