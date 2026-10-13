import { v } from "convex/values"
import { internalQuery, mutation, query } from "./_generated/server"
import { requireOwnedMission } from "./permissions"

const researchValidator = v.object({
  _id: v.id("research"),
  _creationTime: v.number(),
  missionId: v.id("missions"),
  query: v.string(),
  result: v.string(),
  citations: v.array(v.string()),
  createdAt: v.number(),
})

export const save = mutation({
  args: { missionId: v.id("missions"), query: v.string(), result: v.string(), citations: v.array(v.string()) },
  returns: v.id("research"),
  handler: async (ctx, args) => {
    await requireOwnedMission(ctx, args.missionId)
    return ctx.db.insert("research", { missionId: args.missionId, query: args.query, result: args.result, citations: args.citations, createdAt: Date.now() })
  },
})

export const listForSynthesis = query({
  args: { missionId: v.id("missions") },
  returns: v.array(researchValidator),
  handler: async (ctx, args) => {
    await requireOwnedMission(ctx, args.missionId)
    return ctx.db
      .query("research")
      .withIndex("by_mission", q => q.eq("missionId", args.missionId))
      .order("desc")
      .take(10)
  },
})

// Internal worker variant: Council orchestration runs without a browser session.
export const listForSynthesisInternal = internalQuery({
  args: { missionId: v.id("missions") },
  returns: v.array(researchValidator),
  handler: async (ctx, args) =>
    ctx.db
      .query("research")
      .withIndex("by_mission", q => q.eq("missionId", args.missionId))
      .order("desc")
      .take(10),
})
