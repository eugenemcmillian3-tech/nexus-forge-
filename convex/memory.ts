import { paginationOptsValidator, paginationResultValidator } from "convex/server"
import { v } from "convex/values"
import { mutation, query, internalQuery, internalMutation } from "./_generated/server"

const memoryValidator = v.object({ _id: v.id("memories"), _creationTime: v.number(), ownerKey: v.string(), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() })

export const list = query({
  args: { ownerKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(memoryValidator),
  handler: async (ctx, args) => ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", args.ownerKey)).order("desc").paginate(args.paginationOpts),
})

export const getMissionSynthesis = internalQuery({
  args: { missionId: v.id("missions") },
  returns: v.union(v.object({ value: v.string(), confidence: v.number(), source: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", "local-workspace")).filter(q => q.and(q.eq(q.field("missionId"), args.missionId), q.eq(q.field("category"), "research-synthesis"))).order("desc").first()
    return row ? { value: row.value, confidence: row.confidence, source: row.source } : null
  },
})

export const getLearningContext = internalQuery({
  args: { missionId: v.id("missions") },
  returns: v.object({ ownerKey: v.string(), outcomes: v.array(v.object({ value: v.string(), confidence: v.number(), source: v.string() })), lessons: v.array(v.object({ value: v.string(), confidence: v.number(), source: v.string() })) }),
  handler: async (ctx, args) => {
    const mission = await ctx.db.get("missions", args.missionId)
    if (!mission) throw new Error("Mission not found")
    const rows = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", mission.ownerKey)).order("desc").take(40)
    const outcomes = rows.filter(row => row.category === "verification-outcome").slice(0, 8).map(row => ({ value: row.value, confidence: row.confidence, source: row.source }))
    const lessons = rows.filter(row => row.category === "learning-lesson").slice(0, 8).map(row => ({ value: row.value, confidence: row.confidence, source: row.source }))
    return { ownerKey: mission.ownerKey, outcomes, lessons }
  },
})

export const remember = mutation({
  args: { ownerKey: v.string(), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() },
  returns: v.id("memories"),
  handler: async (ctx, args) => ctx.db.insert("memories", { ...args, confidence: Math.max(0, Math.min(1, args.confidence)) }),
})

export const rememberInternal = internalMutation({
  args: { ownerKey: v.string(), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() },
  returns: v.id("memories"),
  handler: async (ctx, args) => ctx.db.insert("memories", { ...args, confidence: Math.max(0, Math.min(1, args.confidence)) }),
})
