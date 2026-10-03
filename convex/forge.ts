import { v } from "convex/values"
import { action, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"

const agents = [
  ["Vision Architect", "Mission mapping"],
  ["Research Oracle", "Evidence & market"],
  ["Systems Engineer", "Architecture"],
  ["Builder Agent", "Code & tests"],
  ["Creative Director", "Brand & media"],
  ["Critic Agent", "Verification"],
] as const

export const createRuns = internalMutation({
  args: { missionId: v.id("missions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const [agent, role] of agents) {
      await ctx.db.insert("agentRuns", { missionId: args.missionId, agent, role, status: "running", progress: 8, note: "Queued for orchestration." })
    }
    return null
  },
})

export const orchestrate = action({
  args: { missionId: v.id("missions"), mission: v.string() },
  returns: v.object({ ok: v.boolean(), summary: v.string() }),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.forge.createRuns, { missionId: args.missionId })
    const response = await fetch(`${process.env.MACALY_BASE_URL}/api/client-app/llm-usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MACALY_API_TOKEN}`,
      },
      body: JSON.stringify({
        chatId: process.env.MACALY_CHAT_ID,
        preset: "FAST",
        messages: [
          { role: "system", content: "You are the NEXUS FORGE orchestration intelligence. Return concise, practical mission decomposition. Do not claim AGI or superintelligence." },
          { role: "user", content: `Mission: ${args.mission}\nReturn: objective, 3 milestones, 3 risks, and the next highest-value action.` },
        ],
        maxTokens: 700,
        temperature: 0.2,
      }),
    })
    if (!response.ok) throw new Error(`AI gateway failed: ${response.status}`)
    const data = (await response.json()) as { text?: string }
    const summary = data.text?.trim() || "The council completed an initial orchestration pass."
    await ctx.runMutation(internal.forge.recordEvidence, { missionId: args.missionId, summary })
    return { ok: true, summary }
  },
})

export const recordEvidence = internalMutation({
  args: { missionId: v.id("missions"), summary: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("evidence", { missionId: args.missionId, agent: "Orchestrator", message: args.summary, score: 0.9, severity: "verified" })
    await ctx.db.patch("missions", args.missionId, { status: "review", completion: 24 })
    return null
  },
})
