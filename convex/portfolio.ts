import { action, internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values"
import { requireOperator, requireOwnedMission } from "./permissions";
import { internal } from "./_generated/api";
import { callAiProvider } from "./aiProvider";
import { jsonrepair } from "jsonrepair";
import { unresolvedEscalationBlock } from "./incidentSafety";

export const decisionSnapshot = query({ args: {}, returns: v.object({ totalMissions: v.number(), completed: v.number(), active: v.number(), blocked: v.number(), completionRate: v.number(), recommendation: v.union(v.literal("continue"), v.literal("prioritize"), v.literal("review")), rationale: v.array(v.string()), priorities: v.array(v.object({ rank: v.number(), action: v.string(), reason: v.string() })) }), handler: async (ctx) => { const ownerKey = await requireOperator(ctx); const missions = await ctx.db.query("missions").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).order("desc").take(100); const completed = missions.filter(m => m.status === "complete").length; const blocked = missions.filter(m => m.status === "review").length; const active = missions.filter(m => m.status !== "complete" && m.status !== "review").length; const total = missions.length; const completionRate = total ? completed / total : 0; const rationale: string[] = []; const priorities: { rank: number; action: string; reason: string }[] = []; if (blocked > 0) { rationale.push(`${blocked} mission(s) are in review and need attention.`); priorities.push({ rank: 1, action: "Review blocked missions", reason: "Resolve human review items before starting additional autonomous work." }); } if (active > 0) priorities.push({ rank: priorities.length + 1, action: "Advance approved active missions", reason: "Keep bounded execution moving where approval and acceptance criteria are already present." }); if (completionRate < 0.7 && total > 0) priorities.push({ rank: priorities.length + 1, action: "Prioritize missions with clear acceptance evidence", reason: "Portfolio completion is below the 70% target." }); if (total === 0) { rationale.push("No mission history is available yet; create and approve a mission before prioritizing work."); priorities.push({ rank: 1, action: "Create and approve a mission", reason: "The portfolio has no execution history yet." }); } if (completionRate >= 0.7) rationale.push("Portfolio completion is strong; continue the current execution pattern."); else if (total > 0) rationale.push("Completion is below target; prioritize missions with clear acceptance evidence."); const recommendation: "continue" | "prioritize" | "review" = blocked > 0 ? "review" : completionRate >= 0.7 ? "continue" : "prioritize"; return { totalMissions: total, completed, active, blocked, completionRate, recommendation, rationale, priorities }; }, });

export const learningSnapshot = query({ args: {}, returns: v.object({ missionsObserved: v.number(), verifiedOutcomes: v.number(), passedOutcomes: v.number(), failedOutcomes: v.number(), lessonsCaptured: v.number(), measuredOutcomes: v.number(), measurementCoverage: v.number(), successRate: v.number(), patterns: v.array(v.object({ label: v.string(), count: v.number(), implication: v.string() })), lessons: v.array(v.object({ value: v.string(), confidence: v.number(), source: v.string() })), prioritySignals: v.array(v.object({ signal: v.string(), weight: v.number(), implication: v.string() })) }), handler: async (ctx: QueryCtx) => { const ownerKey = await requireOperator(ctx); const missions = await ctx.db.query("missions").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).order("desc").take(100); const missionRows: Array<{ verifications: Doc<"verifications">[]; measurements: Doc<"measurements">[]; incidents: Doc<"incidents">[] }> = []; for (const mission of missions) { const verifications: Doc<"verifications">[] = await ctx.db.query("verifications").withIndex("by_mission", q => q.eq("missionId", mission._id)).collect(); const measurements: Doc<"measurements">[] = await ctx.db.query("measurements").withIndex("by_mission", q => q.eq("missionId", mission._id)).collect(); const incidents: Doc<"incidents">[] = await ctx.db.query("incidents").withIndex("by_mission", q => q.eq("missionId", mission._id)).collect(); missionRows.push({ verifications, measurements, incidents }); } const verifications = missionRows.flatMap(row => row.verifications); const measurements = missionRows.flatMap(row => row.measurements); const incidents = missionRows.flatMap(row => row.incidents); const memories = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).order("desc").take(100); const passed = verifications.filter(vr => vr.passed).length; const failed = verifications.length - passed; const lessons = memories.filter(m => m.category === "learning-lesson").slice(0, 12).map(m => ({ value: m.value, confidence: m.confidence, source: m.source })); const recovered = incidents.filter(i => i.status === "resolved").length; const escalated = incidents.filter(i => i.status === "escalated").length; const patterns = [...(passed > 0 ? [{ label: "Verified delivery success", count: passed, implication: "Reuse the acceptance patterns associated with passed verification evidence." }] : []), ...(failed > 0 ? [{ label: "Verification failures", count: failed, implication: "Require stronger evidence or review before repeating similar delivery paths." }] : []), ...(recovered > 0 ? [{ label: "Recovered incidents", count: recovered, implication: "Recovery paths are producing reusable operational evidence." }] : []), ...(escalated > 0 ? [{ label: "Escalated incidents", count: escalated, implication: "Keep human escalation available for repeated or high-risk failures." }] : [])]; const prioritySignals = [...(failed > passed ? [{ signal: "Recent verification risk", weight: 0.8, implication: "Favor missions with stronger acceptance evidence and lower delivery uncertainty." }] : []), ...(escalated > 0 ? [{ signal: "Escalation history", weight: 0.7, implication: "Surface higher-risk work for human review earlier." }] : []), ...(recovered > 0 ? [{ signal: "Recovery capability", weight: 0.35, implication: "Prefer bounded missions with known recovery paths when otherwise comparable." }] : []), ...(passed > 0 && failed === 0 ? [{ signal: "Verified success pattern", weight: 0.5, implication: "Give modest priority to missions matching previously successful evidence patterns." }] : [])]; const measuredOutcomes = measurements.length; const measurementCoverage = verifications.length ? Math.min(1, measuredOutcomes / verifications.length) : 0; return { missionsObserved: missions.length, verifiedOutcomes: verifications.length, passedOutcomes: passed, failedOutcomes: failed, lessonsCaptured: lessons.length, measuredOutcomes, measurementCoverage, successRate: verifications.length ? passed / verifications.length : 0, patterns, lessons, prioritySignals }; }, });

export const recordDecision = mutation({ args: { missionId: v.id("missions"), priorityRank: v.number(), action: v.string(), decision: v.union(v.literal("approve"), v.literal("reject"), v.literal("defer"), v.literal("escalate")), note: v.optional(v.string()) }, returns: v.id("portfolioDecisions"), handler: async (ctx, args) => { await requireOwnedMission(ctx, args.missionId); return ctx.db.insert("portfolioDecisions", { missionId: args.missionId, priorityRank: args.priorityRank, action: args.action, decision: args.decision, note: args.note, createdAt: Date.now() }); }, });

export const nextOpportunity = query({
  args: {},
  returns: v.object({ ownerKey: v.string(), title: v.string(), mission: v.string(), rationale: v.array(v.string()), evidence: v.array(v.string()), requiresHumanDecision: v.boolean(), blockedByReview: v.boolean() }),
  handler: async (ctx) => { const ownerKey = await requireOperator(ctx);
    const missions = await ctx.db.query("missions").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).order("desc").take(100);
    const latest = missions[0];
    const blocked = missions.filter(m => m.status === "review").length;
    const missionIds = new Set(missions.map(m => m._id));
    const measurements = (await Promise.all(missions.map(mission => ctx.db.query("measurements").withIndex("by_mission", q => q.eq("missionId", mission._id)).collect()))).flat().sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    const lessons = await ctx.db.query("memories").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).order("desc").take(80);
    const lessonRows = lessons.filter(m => m.category === "learning-lesson").slice(0, 4);
    const latestMeasurement = measurements[0];
    if (blocked > 0) return { ownerKey, title: "Resolve review before the next mission", mission: "Review blocked or escalated work, resolve the human decision queue, then generate the next opportunity.", rationale: ["Governance priority is to resolve existing review items before adding new autonomous work."], evidence: [String(blocked) + " mission(s) currently require review."], requiresHumanDecision: true, blockedByReview: true };
    const success = latestMeasurement?.status === "pass";
    return {
      ownerKey,
      title: success ? "Reuse the verified delivery pattern" : latest ? "Strengthen the next governed mission" : "Forge the first governed opportunity",
      mission: success ? "Create a new bounded mission that reuses the proven four-domain delivery evidence pattern while testing one new objective." : latest ? "Create a new bounded mission with explicit acceptance evidence and stronger controls around the latest learning signals." : "Create a bounded mission with explicit acceptance criteria, research evidence, human approval, and measured delivery verification.",
      rationale: [success ? "The latest measured outcome passed all four governed delivery domains." : "The portfolio does not yet have a fully passing measured delivery pattern.", ...lessonRows.slice(0, 2).map(row => "Learning signal: " + row.value.slice(0, 220))].slice(0, 3),
      evidence: [...(latest ? ["Latest mission: " + latest.title] : []), ...(latestMeasurement ? ["Latest measurement: " + latestMeasurement.metric + " = " + Math.round(latestMeasurement.actual * 100) + "% (" + latestMeasurement.status + ")"] : []), ...lessonRows.slice(0, 2).map(row => row.value)].slice(0, 5),
      requiresHumanDecision: true,
      blockedByReview: false,
    };
  },
});

export const listReviewQueue = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("missions"), title: v.string(), mission: v.string(), completion: v.number(), approved: v.boolean(), ownerKey: v.string() })),
  handler: async (ctx) => { const ownerKey = await requireOperator(ctx);
    const missions = await ctx.db.query("missions").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).order("desc").take(100);
    return missions.filter((m) => m.status === "review").map((m) => ({ _id: m._id, title: m.title, mission: m.mission, completion: m.completion, approved: m.approved, ownerKey: m.ownerKey }));
  },
});

export const resolveReview = mutation({
  args: { missionId: v.id("missions"), decision: v.union(v.literal("dismiss"), v.literal("reopen")), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwnedMission(ctx, args.missionId);
    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new Error("Mission not found");
    if (mission.status !== "review") throw new Error("Mission is not currently in review");
    const note = args.note.trim();
    if (!note) throw new Error("A human review note is required");
    const nextStatus = args.decision === "dismiss" ? "cancelled" : "draft";
    await ctx.db.patch(args.missionId, { status: nextStatus, approved: false });
    await ctx.runMutation(internal.audit.record, {
      missionId: args.missionId,
      type: "portfolio",
      action: args.decision === "dismiss" ? "review_dismissed" : "review_reopened",
      status: nextStatus,
      detail: `Human review resolution: ${args.decision}. ${note}`,
    });
    return null;
  },
});

const recommendationRow = v.object({
  _id: v.id("opportunityRecommendations"),
  _creationTime: v.number(),
  ownerKey: v.string(),
  title: v.string(),
  mission: v.string(),
  rationale: v.array(v.string()),
  evidence: v.array(v.string()),
  status: v.union(v.literal("recommended"), v.literal("accepted"), v.literal("dismissed")),
  createdAt: v.number(),
});

type OpportunitySource = { title: string; url: string; snippet: string };
function cleanHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}

function parseJsonObject(raw: string): any {
  const normalized = raw.trim().replace(/^\u0060\u0060\u0060(?:json)?\s*/i, "").replace(/\s*\u0060\u0060\u0060$/, "");
  try {
    return JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf("{");
    const end = normalized.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(jsonrepair(normalized.slice(start, end + 1)));
    throw new Error("No JSON object found in model response.");
  }
}

async function discoverSources(queryText: string): Promise<OpportunitySource[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryText)}`;
  const response = await fetch(searchUrl, { headers: { "User-Agent": "NEXUS-FORGE-Opportunity-Discovery/1.0" } });
  if (!response.ok) throw new Error(`Opportunity search failed (${response.status}).`);
  const html = await response.text();
  const sources: OpportunitySource[] = [];
  const pattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) && sources.length < 5) {
    const rawUrl = match[1];
    try {
      const parsed = new URL(rawUrl, searchUrl);
      const target = parsed.searchParams.get("uddg") || rawUrl;
      const url = decodeURIComponent(target);
      if (/^https?:\/\//i.test(url) && !sources.some(source => source.url === url)) {
        sources.push({ title: cleanHtml(match[2]), url, snippet: "" });
      }
    } catch {}
  }
  return Promise.all(sources.map(async source => {
    try {
      const page = await fetch(source.url, { headers: { "User-Agent": "NEXUS-FORGE-Opportunity-Discovery/1.0" } });
      if (!page.ok) return source;
      return { ...source, snippet: cleanHtml((await page.text()).slice(0, 80000)).slice(0, 3500) };
    } catch {
      return source;
    }
  }));
}

export const discoverOpportunities = action({
  args: { ownerKey: v.optional(v.string()), theme: v.string() },
  returns: v.object({ recommendations: v.array(v.object({ title: v.string(), mission: v.string(), rationale: v.array(v.string()), evidence: v.array(v.string()) })) }),
  handler: async (ctx, args) => {
    const ownerKey = await requireOperator(ctx);
    const theme = args.theme.trim() || "emerging opportunities for small AI-enabled digital products";
    const sources = await discoverSources(theme);
    if (!sources.length) throw new Error("Opportunity discovery returned no usable web sources.");
    const dossier = sources.map((s, i) => `SOURCE ${i + 1}\nTITLE: ${s.title}\nURL: ${s.url}\nCONTENT: ${s.snippet || "(content unavailable)"}`).join("\n\n");
    const response = await callAiProvider("research", `You are the NEXUS FORGE Opportunity Scout. Use ONLY this retrieved web dossier. Identify three concrete, bounded venture opportunities suitable for human-governed execution. Do not invent facts or citations. Each opportunity must state a specific customer/problem, a testable digital product mission, why now, and key uncertainty. Return JSON exactly as {"recommendations":[{"title":"...","mission":"...","rationale":["..."],"evidence":["URL — evidence claim"]}]} and use only URLs present in the dossier.\n\nTHEME: ${theme}\n\nDOSSIER:\n${dossier.slice(0, 17000)}`, 1800);
    let parsed: any;
    try {
      parsed = parseJsonObject(response);
    } catch (error) {
      const parseDetail = error instanceof Error ? error.message.slice(0, 100) : "unknown parse error";
      throw new Error(`Opportunity scout returned invalid structured output (${response.length} chars; recommendations=${response.includes("recommendations")}; fenced=${response.includes("~~~") || response.includes(String.fromCharCode(96).repeat(3))}; braces=${response.includes("{") && response.includes("}")}; ${parseDetail}).`);
    }
    const recommendations = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations.slice(0, 3)
          .filter((item: any) => item && typeof item.title === "string" && typeof item.mission === "string")
          .map((item: any) => ({
            title: item.title.trim(),
            mission: item.mission.trim(),
            rationale: Array.isArray(item.rationale) ? item.rationale.filter((x: any) => typeof x === "string").slice(0, 4) : [],
            evidence: Array.isArray(item.evidence)
              ? item.evidence.filter((x: any) => typeof x === "string" && sources.some(source => x.includes(source.url))).slice(0, 5)
              : [],
          }))
      : [];
    if (!recommendations.length) throw new Error("Opportunity scout returned no valid recommendations.");
    for (const item of recommendations) {
      await ctx.runMutation(internal.portfolio.persistRecommendation, { ownerKey, ...item });
    }
    return { recommendations };
  },
});

export const persistRecommendation = internalMutation({
  args: { ownerKey: v.string(), title: v.string(), mission: v.string(), rationale: v.array(v.string()), evidence: v.array(v.string()) },
  returns: v.id("opportunityRecommendations"),
  handler: async (ctx, args) => ctx.db.insert("opportunityRecommendations", { ...args, status: "recommended", createdAt: Date.now() }),
});

export const listRecommendations = query({
  args: { ownerKey: v.optional(v.string()) },
  returns: v.array(recommendationRow),
  handler: async (ctx, args) => {
    const ownerKey = await requireOperator(ctx);
    return ctx.db.query("opportunityRecommendations").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).order("desc").take(12);
  },
});

export const dismissRecommendation = mutation({
  args: { id: v.id("opportunityRecommendations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerKey = await requireOperator(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.ownerKey !== ownerKey || row.status !== "recommended") throw new Error("Opportunity recommendation is no longer actionable.");
    await ctx.db.patch(args.id, { status: "dismissed" });
    return null;
  },
});

export const acceptRecommendation = mutation({
  args: { id: v.id("opportunityRecommendations") },
  returns: v.id("missions"),
  handler: async (ctx, args) => {
    const ownerKey = await requireOperator(ctx);
    const recommendation = await ctx.db.get(args.id);
    if (!recommendation || recommendation.ownerKey !== ownerKey || recommendation.status !== "recommended") throw new Error("Opportunity recommendation is no longer actionable.");
    const missionId = await ctx.db.insert("missions", {
      title: recommendation.title,
      mission: recommendation.mission,
      autonomy: "governed",
      budget: 0,
      status: "draft",
      completion: 0,
      approved: false,
      ownerKey: recommendation.ownerKey,
    });
    // Seed the mission's research table with the discovery dossier so Council
    // orchestration consumes the same evidence automatically on approved execution.
    const citations = recommendation.evidence
      .map((item) => item.match(/https?:\/\/[^\s]+/)?.[0]?.replace(/[),.;]+$/, ""))
      .filter((url): url is string => Boolean(url));
    await ctx.db.insert("research", {
      missionId,
      query: `Opportunity discovery: ${recommendation.title}`,
      result: [
        "Persisted opportunity discovery dossier (web-derived; review source claims before relying on them).",
        recommendation.mission,
        ...recommendation.rationale.map((item) => `Rationale: ${item}`),
        ...recommendation.evidence.map((item) => `Evidence: ${item}`),
        "Governance: this dossier informs Council planning only; it does not approve execution or delivery.",
      ].join("\n"),
      citations: [...new Set(citations)],
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.id, { status: "accepted" });
    await ctx.runMutation(internal.audit.record, {
      missionId,
      type: "portfolio",
      action: "opportunity_accepted",
      status: "draft",
      detail: `Human operator accepted a web-backed opportunity recommendation and seeded its research dossier (${citations.length} source URL(s)). Mission remains draft pending separate approval.`,
    });
    return missionId;
  },
});

export const createRecommendedMission = mutation({
  args: { title: v.string(), mission: v.string(), ownerKey: v.string() },
  returns: v.id("missions"),
  handler: async (ctx, args) => {
    const ownerKey = await requireOperator(ctx);
    const title = args.title.trim();
    const mission = args.mission.trim();
    if (!title || !mission) throw new Error("Recommendation requires a title and mission.");
    const id = await ctx.db.insert("missions", { title, mission, autonomy: "governed", budget: 0, status: "draft", completion: 0, approved: false, ownerKey });
    await ctx.db.insert("opportunityRecommendations", { ownerKey, title, mission, rationale: ["Human operator explicitly accepted the recommended opportunity."], evidence: ["Generated from persisted portfolio learning and measured outcomes."], status: "accepted", createdAt: Date.now() });
    await ctx.runMutation(internal.audit.record, { missionId: id, type: "portfolio", action: "recommended_opportunity_accepted", status: "draft", detail: "Recommended opportunity converted to a draft mission; separate human mission approval is still required." });
    return id;
  },
});

export const executeApprovedMission = mutation({ args: { missionId: v.id("missions"), priorityRank: v.number(), action: v.string() }, returns: v.object({ runId: v.id("missionRuns"), alreadyRunning: v.boolean() }), handler: async (ctx, args) => { await requireOwnedMission(ctx, args.missionId); const mission = await ctx.db.get(args.missionId); if (!mission) throw new Error("Mission not found"); if (!mission.approved) throw new Error("Mission requires approval before execution"); if (mission.status === "complete") throw new Error("Mission is already complete"); const latestDecision = await ctx.db.query("portfolioDecisions").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").first(); if (!latestDecision || latestDecision.decision !== "approve" || latestDecision.priorityRank !== args.priorityRank || latestDecision.action !== args.action) throw new Error("A matching human approval is required before execution"); const dependencies = await ctx.db.query("missionDependencies").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect(); for (const dep of dependencies) { if (dep.kind !== "blocks") continue; const prerequisite = await ctx.db.get(dep.dependsOnMissionId); if (!prerequisite || prerequisite.status !== "complete") throw new Error(`Execution blocked by prerequisite mission ${dep.dependsOnMissionId}`); } const resources = await ctx.db.query("missionResources").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect(); for (const resource of resources) { const holders = await ctx.db.query("missionResources").withIndex("by_resource", q => q.eq("resourceKey", resource.resourceKey)).collect(); const conflict = holders.find(h => h.missionId !== args.missionId && h.status === "held" && (h.mode === "exclusive" || resource.mode === "exclusive")); if (conflict) throw new Error(`Execution blocked by resource conflict: ${resource.resourceKey}`); } // Escalations are a hard stop until an operator records a recovery and lesson.
    const missionIncidents = await ctx.db.query("incidents").withIndex("by_mission", q => q.eq("missionId", args.missionId)).collect(); const restartBlock = unresolvedEscalationBlock(missionIncidents); if (restartBlock) throw new Error(restartBlock); const existing = await ctx.db.query("missionRuns").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").first(); if (existing && (existing.status === "running" || existing.status === "paused")) { await ctx.scheduler.runAfter(0, internal.missionRunner.tickNow, { runId: existing._id }); return { runId: existing._id, alreadyRunning: true }; } const now = Date.now(); for (const resource of resources) if (resource.status !== "held") await ctx.db.patch(resource._id, { status: "held", heldAt: now }); const runId = await ctx.db.insert("missionRuns", { missionId: args.missionId, startedAt: now, deadlineAt: now + 20 * 60 * 1000, maxRetries: 2, retries: 0, status: "running", currentStage: "orchestration", nextActionAt: now }); await ctx.runMutation(internal.audit.record, { missionId: args.missionId, type: "orchestration", action: "execution_preflight_passed", status: "ready", detail: `${dependencies.filter(d => d.kind === "blocks").length} blocking dependencies satisfied; ${resources.length} resource reservation(s) held.` }); await ctx.scheduler.runAfter(0, internal.missionRunner.tickNow, { runId }); return { runId, alreadyRunning: false }; }, });

export const listDecisions = query({ args: { missionId: v.optional(v.id("missions")) }, returns: v.array(v.object({ _id: v.id("portfolioDecisions"), _creationTime: v.number(), missionId: v.id("missions"), priorityRank: v.number(), action: v.string(), decision: v.union(v.literal("approve"), v.literal("reject"), v.literal("defer"), v.literal("escalate")), note: v.optional(v.string()), createdAt: v.number() })), handler: async (ctx: QueryCtx, args) => { const ownerKey = await requireOperator(ctx); if (args.missionId) { await requireOwnedMission(ctx, args.missionId); return ctx.db.query("portfolioDecisions").withIndex("by_mission", q => q.eq("missionId", args.missionId!)).order("desc").take(50); } const missions = await ctx.db.query("missions").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).collect(); const ids = new Set(missions.map(m => m._id)); const decisions: Doc<"portfolioDecisions">[] = []; for (const mission of missions) { const rows: Doc<"portfolioDecisions">[] = await ctx.db.query("portfolioDecisions").withIndex("by_mission", q => q.eq("missionId", mission._id)).collect(); decisions.push(...rows); } return decisions.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50); }, });
