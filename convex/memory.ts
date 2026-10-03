import { paginationOptsValidator, paginationResultValidator } from "convex/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const memoryValidator = v.object({ _id: v.id("memories"), _creationTime: v.number(), ownerKey: v.string(), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() })

export const list = query({
  args: { ownerKey: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(memoryValidator),
  handler: async (ctx, args) => ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", args.ownerKey)).order("desc").paginate(args.paginationOpts),
})

export const remember = mutation({
  args: { ownerKey: v.string(), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() },
  returns: v.id("memories"),
  handler: async (ctx, args) => ctx.db.insert("memories", { ...args, confidence: Math.max(0, Math.min(1, args.confidence)) }),
})
