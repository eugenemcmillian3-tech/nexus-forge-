import { mutation, query } from "./_generated/server";
import { v } from "convex/values"
import { requireOperator } from "./permissions";

export const decisionSnapshot = query({
  args: {},
  returns: v.object({ totalMissions: v.number(), completed: v.number(), active: v.number(), blocked: v.number(), completionRate: v.number(), recommendation: v.union(v.literal("continue"), v.literal("prioritize"), v.literal("review")), rationale: v.array(v.string()), priorities: v.array(v.object({ rank: v.number(), action: v.string(), reason: v.string() })) }),
  handler: async (ctx) => {
    const missions = await ctx.db.query("missions").order("desc").take(100);
    const completed = missions.filter(m => m.status === "complete").length;
    const blocked = missions.filter(m => m.status === "review").length;
    const active = missions.filter(m => m.status !== "complete" && m.status !== "review").length;
    const total = missions.length;
    const completionRate = total ? completed / total : 0;
    const rationale: string[] = [];
    const priorities: { rank: number; action: string; reason: string }[] = [];
    if (blocked > 0) { rationale.push(`${blocked} mission(s) are in review and need attention.`); priorities.push({ rank: 1, action: "Review blocked missions", reason: "Resolve human review items before starting additional autonomous work." }); }
    if (active > 0) priorities.push({ rank: priorities.length + 1, action: "Advance approved active missions", reason: "Keep bounded execution moving where approval and acceptance criteria are already present." });
    if (completionRate < 0.7 && total > 0) priorities.push({ rank: priorities.length + 1, action: "Prioritize missions with clear acceptance evidence", reason: "Portfolio completion is below the 70% target." });
    if (total === 0) { rationale.push("No mission history is available yet; create and approve a mission before prioritizing work."); priorities.push({ rank: 1, action: "Create and approve a mission", reason: "The portfolio has no execution history yet." }); }
    if (completionRate >= 0.7) rationale.push("Portfolio completion is strong; continue the current execution pattern."); else if (total > 0) rationale.push("Completion is below target; prioritize missions with clear acceptance evidence.");
    const recommendation: "continue" | "prioritize" | "review" = blocked > 0 ? "review" : completionRate >= 0.7 ? "continue" : "prioritize";
    return { totalMissions: total, completed, active, blocked, completionRate, recommendation, rationale, priorities };
  },
});

export const learningSnapshot = query({
  args: {},
  returns: v.object({ missionsObserved: v.number(), verifiedOutcomes: v.number(), passedOutcomes: v.number(), failedOutcomes: v.number(), lessonsCaptured: v.number(), successRate: v.number(), patterns: v.array(v.object({ label: v.string(), count: v.number(), implication: v.string() })), lessons: v.array(v.object({ value: v.string(), confidence: v.number(), source: v.string() })), prioritySignals: v.array(v.object({ signal: v.string(), weight: v.number(), implication: v.string() })) }),
  handler: async (ctx) => {
    const missions = await ctx.db.query("missions").order("desc").take(100);
    const verifications = await ctx.db.query("verifications").order("desc").take(100);
    const incidents = await ctx.db.query("incidents").order("desc").take(100);
    const memories = await ctx.db.query("memories").order("desc").take(100);
    const passed = verifications.filter(vr => vr.passed).length;
    const failed = verifications.length - passed;
    const lessons = memories.filter(m => m.category === "learning-lesson").slice(0, 12).map(m => ({ value: m.value, confidence: m.confidence, source: m.source }));
    const recovered = incidents.filter(i => i.status === "resolved").length;
    const escalated = incidents.filter(i => i.status === "escalated").length;
    const patterns = [
      ...(passed > 0 ? [{ label: "Verified delivery success", count: passed, implication: "Reuse the acceptance patterns associated with passed verification evidence." }] : []),
      ...(failed > 0 ? [{ label: "Verification failures", count: failed, implication: "Require stronger evidence or review before repeating similar delivery paths." }] : []),
      ...(recovered > 0 ? [{ label: "Recovered incidents", count: recovered, implication: "Recovery paths are producing reusable operational evidence." }] : []),
      ...(escalated > 0 ? [{ label: "Escalated incidents", count: escalated, implication: "Keep human escalation available for repeated or high-risk failures." }] : []),
    ];
    const prioritySignals = [
      ...(failed > passed ? [{ signal: "Recent verification risk", weight: 0.8, implication: "Favor missions with stronger acceptance evidence and lower delivery uncertainty." }] : []),
      ...(escalated > 0 ? [{ signal: "Escalation history", weight: 0.7, implication: "Surface higher-risk work for human review earlier." }] : []),
      ...(recovered > 0 ? [{ signal: "Recovery capability", weight: 0.35, implication: "Prefer bounded missions with known recovery paths when otherwise comparable." }] : []),
      ...(passed > 0 && failed === 0 ? [{ signal: "Verified success pattern", weight: 0.5, implication: "Give modest priority to missions matching previously successful evidence patterns." }] : []),
    ];
    return { missionsObserved: missions.length, verifiedOutcomes: verifications.length, passedOutcomes: passed, failedOutcomes: failed, lessonsCaptured: lessons.length, successRate: verifications.length ? passed / verifications.length : 0, patterns, lessons, prioritySignals };
  },
});

export const recordDecision = mutation({
  args: { missionId: v.id("missions"), priorityRank: v.number(), action: v.string(), decision: v.union(v.literal("approve"), v.literal("reject"), v.literal("defer"), v.literal("escalate")), note: v.optional(v.string()) },
  returns: v.id("portfolioDecisions"),
  handler: async (ctx, args) => { await requireOperator(ctx); return ctx.db.insert("portfolioDecisions", { missionId: args.missionId, priorityRank: args.priorityRank, action: args.action, decision: args.decision, note: args.note, createdAt: Date.now() }); },
});

export const executeApprovedMission = mutation({
  args: { missionId: v.id("missions"), priorityRank: v.number(), action: v.string() },
  returns: v.object({ runId: v.id("missionRuns"), alreadyRunning: v.boolean() }),
  handler: async (ctx, args) => {
    await requireOperator(ctx)
    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new Error("Mission not found");
    if (!mission.approved) throw new Error("Mission requires approval before execution");
    if (mission.status === "complete") throw new Error("Mission is already complete");
    const latestDecision = await ctx.db.query("portfolioDecisions").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").first();
    if (!latestDecision || latestDecision.decision !== "approve" || latestDecision.priorityRank !== args.priorityRank || latestDecision.action !== args.action) throw new Error("A matching human approval is required before execution");
    const existing = await ctx.db.query("missionRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").first();
    if (existing && (existing.status === "running" || existing.status === "paused")) return { runId: existing._id, alreadyRunning: true };
    const now = Date.now();
    const runId = await ctx.db.insert("missionRuns", { missionId: args.missionId, startedAt: now, deadlineAt: now + 20 * 60 * 1000, maxRetries: 2, retries: 0, status: "running", currentStage: "intent", nextActionAt: now });
    return { runId, alreadyRunning: false };
  },
});

export const listDecisions = query({
  args: { missionId: v.optional(v.id("missions")) },
  returns: v.array(v.object({ _id: v.id("portfolioDecisions"), _creationTime: v.number(), missionId: v.id("missions"), priorityRank: v.number(), action: v.string(), decision: v.union(v.literal("approve"), v.literal("reject"), v.literal("defer"), v.literal("escalate")), note: v.optional(v.string()), createdAt: v.number() })),
  handler: async (ctx, args) => args.missionId ? ctx.db.query("portfolioDecisions").withIndex("by_mission", q => q.eq("missionId", args.missionId!)).order("desc").take(50) : ctx.db.query("portfolioDecisions").order("desc").take(50),
});
