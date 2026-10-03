import { v } from "convex/values"
import { action, internalMutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { callMacalyJson } from "./macaly"

export const list = query({
  args: { missionId: v.id("missions") },
  returns: v.array(v.object({ _id: v.id("research"), _creationTime: v.number(), missionId: v.id("missions"), query: v.string(), result: v.string(), citations: v.array(v.string()), createdAt: v.number() })),
  handler: async (ctx, args) => ctx.db.query("research").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").take(20),
})

export const save = internalMutation({
  args: { missionId: v.id("missions"), query: v.string(), result: v.string(), citations: v.array(v.string()) },
  returns: v.id("research"),
  handler: async (ctx, args) => ctx.db.insert("research", { ...args, createdAt: Date.now() }),
})

export const search = action({
  args: { missionId: v.id("missions"), query: v.string(), deepResearch: v.boolean() },
  returns: v.object({ ok: v.boolean(), result: v.string(), citations: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const data = await callMacalyJson("/api/client-app/internet-search", { query: args.query, deepResearch: args.deepResearch }) as { result?: unknown; citations?: unknown }
    const result = typeof data.result === "string" ? data.result : "No research result returned."
    const citations = Array.isArray(data.citations) ? data.citations.filter((x): x is string => typeof x === "string") : []
    await ctx.runMutation(internal.research.save, { missionId: args.missionId, query: args.query, result, citations })
    return { ok: true, result, citations }
  },
})
