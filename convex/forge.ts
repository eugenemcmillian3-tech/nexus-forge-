import { v } from "convex/values"
import { action, internalMutation, internalQuery, query } from "./_generated/server"
import { internal } from "./_generated/api"

const agents = [
  ["Vision Architect", "Mission mapping"],
  ["Research Oracle", "Evidence & market"],
  ["Systems Engineer", "Architecture"],
  ["Builder Agent", "Code & tests"],
  ["Creative Director", "Brand & media"],
  ["Critic Agent", "Verification"],
] as const
const agentShape = v.object({ _id: v.id("agentRuns"), _creationTime: v.number(), missionId: v.id("missions"), agent: v.string(), role: v.string(), status: v.string(), progress: v.number(), note: v.string() })

async function askCouncil(prompt: string, maxTokens = 700): Promise<string> {
  const response = await fetch(`${process.env.MACALY_BASE_URL}/api/client-app/llm-usage`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MACALY_API_TOKEN}` }, body: JSON.stringify({ chatId: process.env.MACALY_CHAT_ID, preset: "FAST", messages: [{ role: "system", content: prompt }], maxTokens, temperature: 0.15 }) })
  if (!response.ok) throw new Error(`Council AI gateway failed: ${response.status}`)
  const data = (await response.json()) as { text?: string }
  return data.text?.trim() || "No finding returned."
}

export const listRuns = query({ args: { missionId: v.id("missions") }, returns: v.array(agentShape), handler: async (ctx, args) => ctx.db.query("agentRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect() })
export const getRuns = internalQuery({ args: { missionId: v.id("missions") }, returns: v.array(agentShape), handler: async (ctx, args) => ctx.db.query("agentRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect() })

export const createRuns = internalMutation({
  args: { missionId: v.id("missions") }, returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("agentRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect()
    const existingAgents = new Set(existing.map(run => run.agent))
    for (const [agent, role] of agents) if (!existingAgents.has(agent)) await ctx.db.insert("agentRuns", { missionId: args.missionId, agent, role, status: "queued", progress: 0, note: "Queued for orchestration." })
    return null
  },
})

export const updateRun = internalMutation({
  args: { missionId: v.id("missions"), agent: v.string(), status: v.string(), progress: v.number(), note: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.query("agentRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).filter(q => q.eq(q.field("agent"), args.agent)).first()
    if (!run) throw new Error(`Agent run not found: ${args.agent}`)
    await ctx.db.patch(run._id, { status: args.status, progress: Math.max(0, Math.min(100, args.progress)), note: args.note })
    return null
  },
})

export const recordAgentEvidence = internalMutation({
  args: { missionId: v.id("missions"), agent: v.string(), message: v.string(), score: v.number(), severity: v.string() }, returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.insert("evidence", { ...args, score: Math.max(0, Math.min(1, args.score)) }); return null },
})
export const recordCouncilResult = internalMutation({
  args: { missionId: v.id("missions"), summary: v.string() }, returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.insert("evidence", { missionId: args.missionId, agent: "Council Planner", message: args.summary, score: 0.9, severity: "verified" }); await ctx.db.patch(args.missionId, { status: "review", completion: 40 }); return null },
})
export const recordLearningLesson = internalMutation({
  args: { missionId: v.id("missions"), lesson: v.string(), confidence: v.number() }, returns: v.null(),
  handler: async (ctx, args) => { const mission = await ctx.db.get(args.missionId); if (!mission) throw new Error("Mission not found"); await ctx.db.insert("memories", { ownerKey: mission.ownerKey, missionId: mission._id, category: "learning-lesson", key: `council:${Date.now()}`, value: args.lesson.trim(), confidence: Math.max(0, Math.min(1, args.confidence)), source: "council-learning" }); return null },
})

export const orchestrate = action({
  args: { missionId: v.id("missions"), mission: v.string() }, returns: v.object({ ok: v.boolean(), summary: v.string() }),
  handler: async (ctx, args) => {
    const operator = await ctx.runQuery(internal.permissions.currentOperator, {})
    if (!operator) throw new Error("Authenticated operator session required")
    const missionRecord = await ctx.runQuery(internal.missions.getById, { id: args.missionId })
    if (!missionRecord) throw new Error("Mission not found")
    if (!missionRecord.approved) throw new Error("Human mission approval is required before council execution")
    if (missionRecord.status === "complete") throw new Error("Mission is already complete")
    await ctx.runMutation(internal.forge.createRuns, { missionId: args.missionId })
    const synthesis = await ctx.runQuery(internal.memory.getMissionSynthesis, { missionId: args.missionId })
    const learning = await ctx.runQuery(internal.memory.getLearningContext, { missionId: args.missionId })
    const researchContext = synthesis ? `PERSISTED RESEARCH SYNTHESIS (confidence ${synthesis.confidence}, source ${synthesis.source}):\n${synthesis.value}` : "No persisted research synthesis exists yet. Explicitly mark research assumptions as unverified."
    const learningContext = learning.outcomes.length || learning.lessons.length ? `PRIOR LEARNING (directional only):\n${learning.outcomes.map(o => `OUTCOME [${o.confidence}]: ${o.value}`).join("\n")}\n${learning.lessons.map(l => `LESSON [${l.confidence}]: ${l.value}`).join("\n")}` : "No prior verification outcomes or learning lessons exist."
    const planner = await askCouncil(`You are the NEXUS FORGE Council Planner. Produce a governed execution plan. Never invent research. Clearly label unverified assumptions. Return OBJECTIVE, MILESTONES with acceptance evidence, RISKS with mitigation, AGENT ASSIGNMENTS, NEXT ACTION, LEARNING INFLUENCE, APPROVAL GATE. Preserve human approval.\n\nMission:\n${args.mission}\n\n${researchContext}\n\n${learningContext}`, 1200)
    await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent: "Council Planner", message: planner, score: 0.9, severity: "verified" })
    const findings: string[] = []
    for (const [agent, role] of agents.slice(0, 5)) {
      await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent, status: "running", progress: 25, note: `Executing ${role} analysis.` })
      try {
        const finding = await askCouncil(`You are the NEXUS FORGE ${agent}, role: ${role}. Work independently using only supplied persisted research and directional learning. Do not invent sources, metrics, customer facts, or implementation results. Identify findings, assumptions, and one recommended action.\n\nMission:\n${args.mission}\n\n${researchContext}\n\n${learningContext}\n\nPlan:\n${planner}`, 650)
        findings.push(`${agent}: ${finding}`)
        await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent, message: finding, score: 0.8, severity: "verified" })
        await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent, status: "complete", progress: 100, note: finding.slice(0, 220) })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent, status: "blocked", progress: 100, note: `Blocked: ${message}` })
        await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent, message: `Agent blocked: ${message}`, score: 0.2, severity: "error" })
        findings.push(`${agent}: BLOCKED — ${message}`)
      }
    }
    await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent: "Critic Agent", status: "running", progress: 60, note: "Reconciling council findings." })
    try {
      const critic = await askCouncil(`You are the NEXUS FORGE Critic Agent. Reconcile the findings against the mission, research, learning, and plan. Flag contradictions and unsupported claims. Produce CONSENSUS, CONFLICTS, VERIFIED ASSUMPTIONS, REQUIRED CHANGES, LEARNING IMPLICATIONS, GO/NO-GO RECOMMENDATION. Preserve human approval.\n\nMission:\n${args.mission}\n\n${researchContext}\n\n${learningContext}\n\nPlan:\n${planner}\n\nFindings:\n${findings.join("\n\n")}`, 900)
      await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent: "Critic Agent", message: critic, score: 0.95, severity: "verified" })
      await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent: "Critic Agent", status: "complete", progress: 100, note: critic.slice(0, 220) })
      await ctx.runMutation(internal.forge.recordLearningLesson, { missionId: args.missionId, lesson: `Council-derived learning:\n${critic}\n\nPlanning lesson:\n${planner}`, confidence: 0.85 })
      const summary = `${planner}\n\nCOUNCIL FINDINGS\n${findings.join("\n\n")}\n\nCRITIC RECONCILIATION\n${critic}`
      await ctx.runMutation(internal.forge.recordCouncilResult, { missionId: args.missionId, summary })
      return { ok: true, summary }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent: "Critic Agent", status: "blocked", progress: 100, note: `Blocked: ${message}` })
      throw error
    }
  },
})
