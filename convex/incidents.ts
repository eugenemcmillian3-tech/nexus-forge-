import { v } from "convex/values"
import { action, internalMutation, internalQuery, query } from "./_generated/server"
import { internal } from "./_generated/api"

const incident = v.object({
  _id: v.id("incidents"), _creationTime: v.number(), missionId: v.id("missions"), runId: v.optional(v.id("missionRuns")),
  kind: v.string(), stage: v.string(), message: v.string(), attempts: v.number(),
  status: v.union(v.literal("open"), v.literal("resolved"), v.literal("escalated")),
  recovery: v.optional(v.string()), lesson: v.optional(v.string()), diagnosis: v.optional(v.string()),
  proposedRecovery: v.optional(v.string()), diagnosisConfidence: v.optional(v.number()),
  createdAt: v.number(), resolvedAt: v.optional(v.number()),
})

export const list = query({
  args: { missionId: v.id("missions") }, returns: v.array(incident),
  handler: async (ctx, args) => ctx.db.query("incidents").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").take(50),
})

export const recordFailure = internalMutation({
  args: { missionId: v.id("missions"), runId: v.optional(v.id("missionRuns")), stage: v.string(), message: v.string(), attempts: v.number(), escalated: v.boolean() },
  returns: v.id("incidents"),
  handler: async (ctx, args) => ctx.db.insert("incidents", {
    missionId: args.missionId, runId: args.runId, kind: "autonomous-execution", stage: args.stage,
    message: args.message, attempts: args.attempts, status: args.escalated ? "escalated" : "open", createdAt: Date.now(),
  }),
})

export const markDiagnosis = internalMutation({
  args: { incidentId: v.id("incidents"), diagnosis: v.string(), proposedRecovery: v.string(), confidence: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.incidentId)
    if (!row) throw new Error("Incident not found")
    await ctx.db.patch(args.incidentId, { diagnosis: args.diagnosis.trim(), proposedRecovery: args.proposedRecovery.trim(), diagnosisConfidence: Math.max(0, Math.min(1, args.confidence)) })
    return null
  },
})

export const resolve = internalMutation({
  args: { incidentId: v.id("incidents"), recovery: v.string(), lesson: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.incidentId)
    if (!row) throw new Error("Incident not found")
    if (row.status === "resolved") return null
    if (row.status === "escalated") throw new Error("Escalated incidents require human review before resolution")
    await ctx.db.patch(args.incidentId, { status: "resolved", recovery: args.recovery.trim(), lesson: args.lesson.trim(), resolvedAt: Date.now() })
    return null
  },
})

export const getOperationalLearning = internalQuery({
  args: { missionId: v.id("missions") },
  returns: v.array(v.object({ stage: v.string(), message: v.string(), status: v.union(v.literal("open"), v.literal("resolved"), v.literal("escalated")), recovery: v.optional(v.string()), lesson: v.optional(v.string()), diagnosis: v.optional(v.string()), proposedRecovery: v.optional(v.string()), diagnosisConfidence: v.optional(v.number()) })),
  handler: async (ctx, args) => ctx.db.query("incidents").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").take(12).then(rows => rows.map(r => ({ stage: r.stage, message: r.message, status: r.status, recovery: r.recovery, lesson: r.lesson, diagnosis: r.diagnosis, proposedRecovery: r.proposedRecovery, diagnosisConfidence: r.diagnosisConfidence }))),
})

export const getById = internalQuery({
  args: { incidentId: v.id("incidents") }, returns: v.union(incident, v.null()),
  handler: async (ctx, args) => ctx.db.get(args.incidentId),
})

export const getOpenForRun = internalQuery({
  args: { runId: v.id("missionRuns") }, returns: v.union(incident, v.null()),
  handler: async (ctx, args) => ctx.db.query("incidents").filter(q => q.and(q.eq(q.field("runId"), args.runId), q.eq(q.field("status"), "open"))).order("desc").first(),
})

export const diagnose = action({
  args: { incidentId: v.id("incidents") }, returns: v.null(),
  handler: async (ctx, args) => {
    const incident = await ctx.runQuery(internal.incidents.getById, { incidentId: args.incidentId })
    if (!incident || incident.status === "resolved") return null
    const response = await fetch(`${process.env.MACALY_BASE_URL}/api/client-app/llm-usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MACALY_API_TOKEN}` },
      body: JSON.stringify({ chatId: process.env.MACALY_CHAT_ID, preset: "FAST", messages: [{ role: "system", content: `You are the NEXUS FORGE Incident Diagnostician. Analyze one autonomous execution failure using only the supplied facts. Do not invent logs or root causes. Return exactly three labeled sections: DIAGNOSIS, PROPOSED RECOVERY, CONFIDENCE. The recovery must be a safe, bounded next action; never recommend bypassing human approval, security controls, tests, or deployment gates. If evidence is insufficient, say so and recommend human investigation.\\n\\nMission: ${incident.missionId}\\nStage: ${incident.stage}\\nFailure: ${incident.message}\\nAttempts: ${incident.attempts}` }], maxTokens: 500, temperature: 0.1 }),
    })
    if (!response.ok) throw new Error(`Incident diagnosis gateway failed: ${response.status}`)
    const data = await response.json() as { text?: string }
    const text = data.text?.trim() || "DIAGNOSIS\\nInsufficient evidence.\\nPROPOSED RECOVERY\\nHuman investigation required.\\nCONFIDENCE\\n0"
    const confidenceMatch = text.match(/CONFIDENCE\\s*[:\\n]\\s*(0(?:\\.\\d+)?|1(?:\\.0+)?)/i)
    const confidence = confidenceMatch ? Number(confidenceMatch[1]) : 0
    const diagnosis = text.match(/DIAGNOSIS\\s*[:\\n]\\s*([\\s\\S]*?)(?=\\n\\s*PROPOSED RECOVERY|$)/i)?.[1]?.trim() || "Insufficient evidence."
    const proposedRecovery = text.match(/PROPOSED RECOVERY\\s*[:\\n]\\s*([\\s\\S]*?)(?=\\n\\s*CONFIDENCE|$)/i)?.[1]?.trim() || "Human investigation required."
    await ctx.runMutation(internal.incidents.markDiagnosis, { incidentId: args.incidentId, diagnosis, proposedRecovery, confidence })
    return null
  },
})
