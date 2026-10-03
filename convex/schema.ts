import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

export default defineSchema({
  ...authTables,
  missions: defineTable({
    title: v.string(), mission: v.string(), autonomy: v.string(), budget: v.number(),
    status: v.union(v.literal("draft"), v.literal("running"), v.literal("review"), v.literal("complete")),
    completion: v.number(), approved: v.boolean(), ownerKey: v.string(),
  }).index("by_owner", ["ownerKey"]),
  agentRuns: defineTable({ missionId: v.id("missions"), agent: v.string(), role: v.string(), status: v.string(), progress: v.number(), note: v.string() }).index("by_mission", ["missionId"]),
  evidence: defineTable({ missionId: v.id("missions"), agent: v.string(), message: v.string(), score: v.number(), severity: v.string() }).index("by_mission", ["missionId"]),
  memories: defineTable({ ownerKey: v.string(), missionId: v.optional(v.id("missions")), category: v.string(), key: v.string(), value: v.string(), confidence: v.number(), source: v.string() }).index("by_owner", ["ownerKey"]),
  research: defineTable({ missionId: v.id("missions"), query: v.string(), result: v.string(), citations: v.array(v.string()), createdAt: v.number() }).index("by_mission", ["missionId"]),
  artifacts: defineTable({ missionId: v.id("missions"), type: v.string(), name: v.string(), content: v.string(), status: v.string(), requiresApproval: v.boolean() }).index("by_mission", ["missionId"]),
  deliveries: defineTable({
    missionId: v.id("missions"), artifactId: v.optional(v.id("artifacts")), target: v.string(), branch: v.string(),
    stage: v.union(v.literal("prepared"), v.literal("approval"), v.literal("github"), v.literal("build"), v.literal("test"), v.literal("deploy"), v.literal("verified"), v.literal("blocked")),
    approved: v.boolean(), status: v.string(), evidence: v.string(), createdAt: v.number(),
  }).index("by_mission", ["missionId"]),
})
