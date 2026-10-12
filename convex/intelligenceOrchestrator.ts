import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { callAiProvider } from "./aiProvider";
import { parseMissionSpecification } from "./intentContract";

const strategy = v.object({
  name: v.string(),
  rationale: v.string(),
  tradeoff: v.string(),
  expectedOutcome: v.string(),
});
const spec = v.object({
  objective: v.string(),
  constraints: v.array(v.string()),
  dependencies: v.array(v.string()),
  acceptanceCriteria: v.array(v.string()),
  risks: v.array(v.string()),
  deadline: v.string(),
  strategies: v.array(strategy),
  recommendedStrategy: v.number(),
});
const savedShape = v.object({
  _id: v.id("memories"),
  _creationTime: v.number(),
  key: v.string(),
  value: v.string(),
  confidence: v.number(),
  source: v.string(),
});

export const listRecent = query({
  args: {},
  returns: v.array(savedShape),
  handler: async (ctx) => {
    const ownerKey = await getAuthUserId(ctx);
    if (!ownerKey) return [];
    const rows = await ctx.db.query("memories")
      .withIndex("by_owner", q => q.eq("ownerKey", ownerKey))
      .order("desc")
      .take(80);
    return rows.filter(row => row.category === "intent-specification").slice(0, 8)
      .map(({ _id, _creationTime, key, value, confidence, source }) => ({ _id, _creationTime, key, value, confidence, source }));
  },
});

export const saveSpec = internalMutation({
  args: { ownerKey: v.string(), intent: v.string(), domain: v.string(), budget: v.number(), horizon: v.optional(v.string()), specification: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("memories", {
      ownerKey: args.ownerKey,
      category: "intent-specification",
      key: `intent-spec:${Date.now()}`,
      value: JSON.stringify({ intent: args.intent, domain: args.domain, budget: args.budget, horizon: args.horizon ?? '14 days', specification: args.specification }),
      confidence: 0.7,
      source: "intelligence-orchestrator-ai-draft",
    });
    return null;
  },
});

export const compileIntent = action({
  args: { intent: v.string(), domain: v.string(), budget: v.number(), horizon: v.string() },
  returns: v.object({ specification: spec, saved: v.boolean() }),
  handler: async (ctx, args) => {
    const ownerKey = await getAuthUserId(ctx);
    if (!ownerKey) throw new Error("Authenticated operator session required");
    const intent = args.intent.trim().slice(0, 3000);
    if (intent.length < 12) throw new Error("Describe the intended outcome in at least 12 characters.");
    const budget = Math.max(0, Math.min(500, Math.round(args.budget)));
    const domain = args.domain.trim().slice(0, 100);
    const horizon = args.horizon.trim().slice(0, 80);
    const prompt = `You are the NEXUS FORGE Intent Compiler. Convert the user's request into a precise, testable mission contract. Return ONLY valid JSON matching this exact shape: {"objective":"string","constraints":["string"],"dependencies":["string"],"acceptanceCriteria":["string"],"risks":["string"],"deadline":"string","strategies":[{"name":"string","rationale":"string","tradeoff":"string","expectedOutcome":"string"}],"recommendedStrategy":0}. Provide 2 or 3 genuinely different strategies. recommendedStrategy must be a valid zero-based index. Use 2-6 concise items per list. Treat missing information as explicit assumptions or constraints, never as known facts. Keep within the budget cap. Do not assert that any platform, model, API, hosting service, product, or free tier is available, configured, free, or suitable unless that is established in the prompt. Prefer the user's existing configured stack. Any unverified external service must be explicitly labelled 'unverified option — confirm availability, pricing, and credentials before use'; do not present it as a dependency already secured. Never claim work has already been executed. Keep external actions behind human approval. The deadline should reflect the user's horizon and be a relative target if no calendar date was given.\n\nINTENT: ${intent}\nDOMAIN: ${domain}\nBUDGET CAP USD: ${budget}\nTIME HORIZON: ${horizon}`;
    const raw = await callAiProvider("planner", prompt, 1400);
    const result = parseMissionSpecification(raw);
    const specification = JSON.stringify(result);
    await ctx.runMutation(internal.intelligenceOrchestrator.saveSpec, { ownerKey, intent, domain, budget, horizon, specification });
    return { specification: result, saved: true };
  },
});
