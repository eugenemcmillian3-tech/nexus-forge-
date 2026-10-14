import { v } from "convex/values"
import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { callAiProvider, COUNCIL_MODELS } from "./aiProvider"
import { requireOwnedMission } from "./permissions"

const agents = [["Vision Architect", "Mission mapping"], ["Research Oracle", "Evidence & market"], ["Systems Engineer", "Architecture"], ["Builder Agent", "Code & tests"], ["Creative Director", "Brand & media"], ["Critic Agent", "Verification"]] as const
const agentShape = v.object({ _id: v.id("agentRuns"), _creationTime: v.number(), missionId: v.id("missions"), agent: v.string(), role: v.string(), status: v.string(), progress: v.number(), note: v.string() })

async function askCouncil(prompt: string, maxTokens = 700, model: keyof typeof COUNCIL_MODELS = "planner", ctx?: any, ownerKey?: string): Promise<string> {
  const recordUsage = ctx && ownerKey ? async (usage: any) => {
    try { await ctx.runMutation((internal as any).manifestIntelligence.recordProviderUsageInternal, { ownerKey, ...usage }) } catch { /* Usage telemetry must not break a successful Council response. */ }
  } : undefined
  return await callAiProvider(COUNCIL_MODELS[model], prompt, maxTokens, recordUsage)
}

export const listRuns = query({ args: { missionId: v.id("missions") }, returns: v.array(agentShape), handler: async (ctx, args) => { await requireOwnedMission(ctx, args.missionId); return await ctx.db.query("agentRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect() } })
export const getRuns = internalQuery({ args: { missionId: v.id("missions") }, returns: v.array(agentShape), handler: async (ctx, args) => ctx.db.query("agentRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect() })
export const createRuns = internalMutation({ args: { missionId: v.id("missions") }, returns: v.null(), handler: async (ctx, args) => { const existing = await ctx.db.query("agentRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect(); const existingAgents = new Set(existing.map(run => run.agent)); for (const [agent, role] of agents) if (!existingAgents.has(agent)) await ctx.db.insert("agentRuns", { missionId: args.missionId, agent, role, status: "queued", progress: 0, note: "Queued for orchestration." }); return null } })
export const updateRun = internalMutation({ args: { missionId: v.id("missions"), agent: v.string(), status: v.string(), progress: v.number(), note: v.string() }, returns: v.null(), handler: async (ctx, args) => { const run = await ctx.db.query("agentRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).filter(q => q.eq(q.field("agent"), args.agent)).first(); if (!run) throw new Error(`Agent run not found: ${args.agent}`); await ctx.db.patch(run._id, { status: args.status, progress: Math.max(0, Math.min(100, args.progress)), note: args.note }); return null } })
export const recordAgentEvidence = internalMutation({ args: { missionId: v.id("missions"), agent: v.string(), message: v.string(), score: v.number(), severity: v.string() }, returns: v.null(), handler: async (ctx, args) => { await ctx.db.insert("evidence", { ...args, score: Math.max(0, Math.min(1, args.score)) }); return null } })
export const recordCouncilResult = internalMutation({ args: { missionId: v.id("missions"), summary: v.string() }, returns: v.null(), handler: async (ctx, args) => { await ctx.db.insert("evidence", { missionId: args.missionId, agent: "Council Planner", message: args.summary, score: 0.9, severity: "verified" }); await ctx.db.patch(args.missionId, { status: "review", completion: 40 }); return null } })
export const recordLearningLesson = internalMutation({ args: { missionId: v.id("missions"), lesson: v.string(), confidence: v.number() }, returns: v.null(), handler: async (ctx, args) => { const mission = await ctx.db.get(args.missionId); if (!mission) throw new Error("Mission not found"); await ctx.db.insert("memories", { ownerKey: mission.ownerKey, missionId: mission._id, category: "learning-lesson", key: `council:${Date.now()}`, value: args.lesson.trim(), confidence: Math.max(0, Math.min(1, args.confidence)), source: "council-learning" }); return null } })

export const orchestrate = action({ args: { missionId: v.id("missions"), mission: v.string() }, returns: v.object({ ok: v.boolean(), summary: v.string() }), handler: async (ctx, args) => { const operator = await ctx.runQuery(internal.permissions.currentOperator, {}); if (!operator) throw new Error("Authenticated operator session required"); const missionRecord = await ctx.runQuery(internal.missions.getByIdInternal, { id: args.missionId }); if (!missionRecord || missionRecord.ownerKey !== operator) throw new Error("Mission not found or access denied"); return await ctx.runAction(internal.forge.orchestrateInternal, { missionId: args.missionId, mission: missionRecord.mission }) } })

const runAgent = async (ctx: any, missionId: any, ownerKey: string, agent: string, role: string, prompt: string, model: keyof typeof COUNCIL_MODELS) => {
  await ctx.runMutation(internal.forge.updateRun, { missionId, agent, status: "running", progress: 20, note: `Running ${role} in coordinated wave using ${COUNCIL_MODELS[model]}.` })
  try {
    const finding = await askCouncil(prompt, 650, model, ctx, ownerKey)
    await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId, agent, message: finding, score: 0.8, severity: "verified" })
    await ctx.runMutation(internal.forge.updateRun, { missionId, agent, status: "complete", progress: 100, note: finding.slice(0, 220) })
    return { agent, finding, ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await ctx.runMutation(internal.forge.updateRun, { missionId, agent, status: "blocked", progress: 100, note: `Blocked: ${message}` })
    await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId, agent, message: `Agent blocked: ${message}`, score: 0.2, severity: "error" })
    return { agent, finding: `BLOCKED — ${message}`, ok: false }
  }
}

export const orchestrateInternal = internalAction({
  args: { missionId: v.id("missions"), mission: v.string() }, returns: v.object({ ok: v.boolean(), summary: v.string() }),
  handler: async (ctx, args) => {
    const missionRecord = await ctx.runQuery(internal.missions.getByIdInternal, { id: args.missionId })
    if (!missionRecord) throw new Error("Mission not found")
    if (!missionRecord.approved) throw new Error("Human mission approval is required before council execution")
    if (missionRecord.status === "complete") throw new Error("Mission is already complete")
    await ctx.runMutation(internal.forge.createRuns, { missionId: args.missionId })
    try {
      const synthesis = await ctx.runQuery(internal.memory.getMissionSynthesis, { missionId: args.missionId })
      const learning = await ctx.runQuery(internal.memory.getLearningContext, { missionId: args.missionId })
      const adaptive = await ctx.runQuery(internal.memory.getAdaptivePreflight, { missionId: args.missionId })
      const researchRows = await ctx.runQuery(internal.researchData.listForSynthesisInternal, { missionId: args.missionId })
      const researchContext = researchRows.length
        ? `RESEARCH EVIDENCE — retrieved for this mission:
${researchRows.map((row, index) => `RESEARCH ${index + 1}
QUERY: ${row.query}
RESULT: ${row.result}
CITATIONS: ${row.citations.join(", ") || "none"}`).join("\n\n")}${synthesis ? `\n\nPERSISTED SYNTHESIS (confidence ${synthesis.confidence}, source ${synthesis.source}):\n${synthesis.value}` : ""}`
        : synthesis
          ? `PERSISTED RESEARCH SYNTHESIS (confidence ${synthesis.confidence}, source ${synthesis.source}):\n${synthesis.value}`
          : "No research evidence exists for this mission. Explicitly mark research assumptions as unverified."
      const learningContext = learning.outcomes.length || learning.lessons.length ? `PRIOR LEARNING (directional only; owner-scoped retrieval):\n${learning.outcomes.map(o => `OUTCOME [${o.confidence}; source ${o.source}]: ${o.value}`).join("\n")}\n${learning.lessons.map(l => `LESSON [${l.confidence}; source ${l.source}]: ${l.value}`).join("\n\n")}\nFor every reviewed lesson, explicitly state whether its applicability matches this mission, why, and which evidence references support considering it. If applicability does not match or evidence is insufficient, mark it NOT APPLICABLE or INCONCLUSIVE and do not generalize it. Treat operator-entered references as leads, not independently verified facts. Do not change strategy automatically.` : "No prior verification outcomes or learning lessons exist. Do not invent historical lessons."
      const preflightContext = `ADAPTIVE PREFLIGHT — derived from persisted verified history; advisory only:\nRISKS:\n${adaptive.riskSignals.map(s => `- [${s.confidence}] ${s.value}`).join("\n") || "- No prior risk signal found."}\nREUSE PATTERNS:\n${adaptive.reusePatterns.map(s => `- [${s.confidence}] ${s.value}`).join("\n") || "- None found."}\nREQUIRED EVIDENCE:\n${adaptive.requiredEvidence.map(x => `- ${x}`).join("\n")}\nRECOVERY GUIDANCE:\n${adaptive.recoveryGuidance.map(x => `- ${x}`).join("\n")}\nRATIONALE:\n${adaptive.rationale.map(x => `- ${x}`).join("\n")}`
      await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent: "Adaptive Preflight", message: preflightContext, score: adaptive.riskSignals.length ? 0.85 : 0.8, severity: "verified" })
      const planner = await askCouncil(`You are the NEXUS FORGE Council Planner. Produce a governed execution plan. Never invent research. Clearly label unverified assumptions. Return OBJECTIVE, MILESTONES with acceptance evidence, RISKS with mitigation, AGENT ASSIGNMENTS, DEPENDENCY WAVES, HANDOFFS, NEXT ACTION, LEARNING INFLUENCE, APPROVAL GATE. Preserve human approval. Adaptive preflight is advisory and must not authorize execution.\n\nMission:\n${args.mission}\n\n${researchContext}\n\n${learningContext}\n\n${preflightContext}`, 1400, "planner", ctx, missionRecord.ownerKey)
      await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent: "Council Planner", message: `Model ${COUNCIL_MODELS.planner}\n${planner}`, score: 0.9, severity: "verified" })
      const common = `Mission:\n${args.mission}\n\n${researchContext}\n\n${learningContext}\n\n${preflightContext}\n\nCouncil Plan:\n${planner}`
      const wave1 = await Promise.all([
        runAgent(ctx, args.missionId, missionRecord.ownerKey, "Vision Architect", "Mission mapping", `You are the Vision Architect. Wave 1 independent analysis. Define objective decomposition, measurable acceptance criteria, and decision boundaries. Do not assume findings from other agents. ${common}`, "wave1"),
        runAgent(ctx, args.missionId, missionRecord.ownerKey, "Research Oracle", "Evidence & market", `You are the Research Oracle. Wave 1 independent analysis. Identify evidence needs, research gaps, and source-verification requirements. Do not invent sources. ${common}`, "wave1"),
        runAgent(ctx, args.missionId, missionRecord.ownerKey, "Systems Engineer", "Architecture", `You are the Systems Engineer. Wave 1 independent analysis. Define architecture, dependencies, interfaces, and technical risks. ${common}`, "wave1"),
      ])
      await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent: "Coordinator", message: `Wave 1 completed. Independent outputs are now available for downstream handoff.\n${wave1.map(x => `${x.agent}: ${x.finding}`).join("\n\n")}`, score: wave1.every(x => x.ok) ? 0.9 : 0.55, severity: wave1.every(x => x.ok) ? "verified" : "warning" })
      const wave1Context = wave1.map(x => `${x.agent}: ${x.finding}`).join("\n\n")
      const wave2 = await Promise.all([
        runAgent(ctx, args.missionId, missionRecord.ownerKey, "Builder Agent", "Code & tests", `You are the Builder Agent. Wave 2 downstream handoff. Use Wave 1 outputs to define implementation, test strategy, and artifact requirements. Flag contradictions rather than silently resolving them. ${common}\n\nWAVE 1 HANDOFF:\n${wave1Context}`, "wave2"),
        runAgent(ctx, args.missionId, missionRecord.ownerKey, "Creative Director", "Brand & media", `You are the Creative Director. Wave 2 downstream handoff. Use Wave 1 outputs to define UX/content requirements and consistency checks. Flag contradictions. ${common}\n\nWAVE 1 HANDOFF:\n${wave1Context}`, "wave2"),
      ])
      await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent: "Coordinator", message: `Wave 2 completed. Builder and Creative Director consumed Wave 1 handoffs.\n${wave2.map(x => `${x.agent}: ${x.finding}`).join("\n\n")}`, score: wave2.every(x => x.ok) ? 0.9 : 0.55, severity: wave2.every(x => x.ok) ? "verified" : "warning" })
      const wave2Context = wave2.map(x => `${x.agent}: ${x.finding}`).join("\n\n")
      const specialistWavesSucceeded = [...wave1, ...wave2].every(x => x.ok)
      await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent: "Critic Agent", status: "running", progress: 60, note: `Reconciling coordinated waves with ${COUNCIL_MODELS.critic}.` })
      const critic = await askCouncil(`You are the NEXUS FORGE Critic Agent. Final coordination wave. Reconcile Wave 1 and Wave 2 outputs against the mission, research, learning, adaptive preflight, and plan. Flag contradictions, missing handoffs, unsupported claims, and unresolved dependencies. Produce CONSENSUS, CONFLICTS, VERIFIED ASSUMPTIONS, REQUIRED CHANGES, HANDOFF QUALITY, LEARNING IMPLICATIONS, GO/NO-GO RECOMMENDATION. Preserve human approval.\n\n${common}\n\nWAVE 1:\n${wave1Context}\n\nWAVE 2:\n${wave2Context}`, 1000, "critic", ctx, missionRecord.ownerKey)
      await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent: "Critic Agent", message: `Model ${COUNCIL_MODELS.critic}\n${critic}`, score: 0.95, severity: "verified" })
      await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent: "Critic Agent", status: "complete", progress: 100, note: critic.slice(0, 220) })
      await ctx.runMutation(internal.forge.recordLearningLesson, { missionId: args.missionId, lesson: `Coordinated council learning:\n${critic}\n\nPlanning lesson:\n${planner}`, confidence: 0.85 })
      const decisionPrompt = `You are the NEXUS FORGE Council Decision Maker. Convert the coordinated council output into a bounded decision. Use only the mission, retrieved research, planner, specialist findings, critic reconciliation, and prior learning below. Never invent evidence. Treat any BLOCKED specialist as a material evidence gap; do not infer their work was completed, and do not recommend GO while required specialist handoffs are missing. Return exactly these sections: DECISION, CONFIDENCE, EVIDENCE BASIS, OPEN QUESTIONS, REQUIRED HUMAN APPROVAL, NEXT EXECUTION STEP. The decision must be GO, REVISE, or NO-GO. Human approval remains mandatory even for GO.

MISSION:
${args.mission}

${researchContext}

PLANNER:
${planner}

WAVE 1:
${wave1Context}

WAVE 2:
${wave2Context}

CRITIC:
${critic}`
      const decision = await askCouncil(decisionPrompt, 900, "planner", ctx, missionRecord.ownerKey)
      await ctx.runMutation(internal.forge.recordAgentEvidence, { missionId: args.missionId, agent: "Council Decision", message: decision, score: specialistWavesSucceeded ? 0.93 : 0.5, severity: specialistWavesSucceeded ? "verified" : "warning" })
      const summary = `ADAPTIVE PREFLIGHT
${preflightContext}

${planner}

COORDINATION MODEL
Planner: ${COUNCIL_MODELS.planner}
Wave 1: ${COUNCIL_MODELS.wave1}
Wave 2: ${COUNCIL_MODELS.wave2}
Critic: ${COUNCIL_MODELS.critic}

RESEARCH EVIDENCE
${researchContext}

WAVE 1 FINDINGS
${wave1Context}

WAVE 2 FINDINGS
${wave2Context}

CRITIC RECONCILIATION
${critic}

FINAL COUNCIL DECISION
${decision}`
      await ctx.runMutation(internal.forge.recordCouncilResult, { missionId: args.missionId, summary })
      return { ok: specialistWavesSucceeded, summary }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const runs = await ctx.runQuery(internal.forge.getRuns, { missionId: args.missionId })
      for (const run of runs.filter(x => x.status === "queued" || x.status === "running")) await ctx.runMutation(internal.forge.updateRun, { missionId: args.missionId, agent: run.agent, status: "blocked", progress: 100, note: `Blocked by orchestration failure: ${message}` })
      throw error
    }
  },
})
