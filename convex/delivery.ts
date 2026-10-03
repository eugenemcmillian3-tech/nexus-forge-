import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const stage = v.union(
  v.literal("prepared"), v.literal("approval"), v.literal("github"),
  v.literal("build"), v.literal("test"), v.literal("deploy"),
  v.literal("verified"), v.literal("blocked")
)

export const list = query({
  args: { missionId: v.id("missions") },
  returns: v.array(v.object({
    _id: v.id("deliveries"), _creationTime: v.number(), missionId: v.id("missions"),
    artifactId: v.optional(v.id("artifacts")), target: v.string(), branch: v.string(),
    stage, approved: v.boolean(), status: v.string(), evidence: v.string(), createdAt: v.number(),
  })),
  handler: async (ctx, args) => ctx.db.query("deliveries").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").take(20),
})

export const prepare = mutation({
  args: { missionId: v.id("missions"), artifactId: v.optional(v.id("artifacts")), target: v.string(), branch: v.string() },
  returns: v.id("deliveries"),
  handler: async (ctx, args) => ctx.db.insert("deliveries", {
    missionId: args.missionId, artifactId: args.artifactId,
    target: args.target.trim() || "eugenemcmillian3-tech/nexus-forge-", branch: args.branch.trim() || "main",
    stage: "approval", approved: false, status: "Awaiting human approval",
    evidence: "No external write has occurred. GitHub Actions is the free delivery executor; Macaly integration is not required.", createdAt: Date.now(),
  }),
})

export const approve = mutation({
  args: { id: v.id("deliveries"), approved: v.boolean() }, returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("deliveries", args.id)
    if (!delivery) throw new Error("Delivery request not found")
    await ctx.db.patch(args.id, {
      approved: args.approved,
      stage: args.approved ? "github" : "blocked",
      status: args.approved ? "Approved; GitHub Actions may execute" : "Blocked by human decision",
      evidence: args.approved ? "Human approval recorded. Execute the repository workflow from GitHub Actions; Macaly's paid GitHub connector is not required." : "Human rejected the delivery request.",
    })
    return null
  },
})

export const advance = mutation({
  args: { id: v.id("deliveries"), nextStage: stage, evidence: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("deliveries", args.id)
    if (!delivery) throw new Error("Delivery request not found")
    if (!delivery.approved) throw new Error("Human approval is required before delivery can advance")
    const allowed: Record<string, string[]> = {
      github: ["build", "blocked"], build: ["test", "blocked"], test: ["deploy", "blocked"],
      deploy: ["verified", "blocked"],
    }
    if (!(allowed[delivery.stage] || []).includes(args.nextStage)) throw new Error(`Invalid delivery transition: ${delivery.stage} → ${args.nextStage}`)
    await ctx.db.patch(args.id, {
      stage: args.nextStage,
      status: args.nextStage === "verified" ? "Live outcome verified" : `Stage ${args.nextStage} ready`,
      evidence: args.evidence,
    })
    return null
  },
})

export const recordWorkflowResult = mutation({
  args: {
    id: v.id("deliveries"),
    conclusion: v.string(),
    runUrl: v.string(),
    commitSha: v.string(),
    summary: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("deliveries", args.id)
    if (!delivery) throw new Error("Delivery request not found")
    if (!delivery.approved) throw new Error("Workflow result cannot be recorded before human approval")
    const normalized = args.conclusion.toLowerCase()
    const passed = normalized === "success" || normalized === "successful" || normalized === "completed"
    await ctx.db.patch(args.id, {
      stage: passed ? "build" : "blocked",
      status: passed ? "GitHub Actions build/test completed" : `GitHub Actions failed: ${args.conclusion}`,
      evidence: `GitHub Actions: ${args.runUrl}\nCommit: ${args.commitSha}\nConclusion: ${args.conclusion}\n${args.summary}`,
    })
    return null
  },
})
