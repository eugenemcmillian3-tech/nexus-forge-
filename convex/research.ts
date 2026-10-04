import { v } from "convex/values"
import { action, internalMutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { callMacalyJson } from "./macaly"

const researchValidator = v.object({ _id: v.id("research"), _creationTime: v.number(), missionId: v.id("missions"), query: v.string(), result: v.string(), citations: v.array(v.string()), createdAt: v.number() })

export const list = query({
  args: { missionId: v.id("missions") },
  returns: v.array(researchValidator),
  handler: async (ctx, args) => ctx.db.query("research").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").take(20),
})

export const save = internalMutation({
  args: { missionId: v.id("missions"), query: v.string(), result: v.string(), citations: v.array(v.string()) },
  returns: v.id("research"),
  handler: async (ctx, args) => ctx.db.insert("research", { ...args, createdAt: Date.now() }),
})

export const saveSynthesisMemory = internalMutation({
  args: { missionId: v.id("missions"), ownerKey: v.string(), value: v.string() },
  returns: v.id("memories"),
  handler: async (ctx, args) => ctx.db.insert("memories", {
    ownerKey: args.ownerKey,
    missionId: args.missionId,
    category: "research-synthesis",
    key: `research-synthesis-${args.missionId}`,
    value: args.value,
    confidence: 0.82,
    source: "NEXUS Research Oracle",
  }),
})

export const search = action({
  args: { missionId: v.id("missions"), query: v.string(), deepResearch: v.boolean() },
  returns: v.object({ ok: v.boolean(), result: v.string(), citations: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const operator = await ctx.runQuery(internal.permissions.currentOperator, {})
    if (!operator) throw new Error("Authenticated operator session required")
    const data = await callMacalyJson("/api/client-app/internet-search", { query: args.query, deepResearch: args.deepResearch }) as { result?: unknown; citations?: unknown }
    const result = typeof data.result === "string" ? data.result : "No research result returned."
    const citations = Array.isArray(data.citations) ? data.citations.filter((x): x is string => typeof x === "string") : []
    await ctx.runMutation(internal.research.save, { missionId: args.missionId, query: args.query, result, citations })
    return { ok: true, result, citations }
  },
})

export const synthesize = action({
  args: { missionId: v.id("missions"), ownerKey: v.string() },
  returns: v.object({ ok: v.boolean(), synthesis: v.string(), sourceCount: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.runQuery(internal.research.listForSynthesis, { missionId: args.missionId })
    if (!rows.length) throw new Error("Run at least one research query before synthesis.")
    const sourceText = rows.map((row, index) => `SOURCE ${index + 1}\nQuery: ${row.query}\nResult: ${row.result}\nCitations: ${row.citations.join(", ")}`).join("\n\n")
    const response = await fetch(`${process.env.MACALY_BASE_URL}/api/client-app/llm-usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MACALY_API_TOKEN}` },
      body: JSON.stringify({
        chatId: process.env.MACALY_CHAT_ID,
        preset: "FAST",
        messages: [
          { role: "system", content: "You are the NEXUS FORGE Research Oracle. Synthesize only the supplied research. Separate established signals, uncertainty, opportunities, risks, and the next research question. Never invent sources or facts." },
          { role: "user", content: `Research dossier:\n${sourceText.slice(0, 14000)}\n\nReturn a concise decision-ready synthesis with sections: SIGNALS, UNCERTAINTY, OPPORTUNITIES, RISKS, NEXT QUESTION.` },
        ],
        maxTokens: 900,
        temperature: 0.1,
      }),
    })
    if (!response.ok) throw new Error(`Research synthesis AI gateway failed: ${response.status}`)
    const data = await response.json() as { text?: unknown }
    const synthesis = typeof data.text === "string" && data.text.trim() ? data.text.trim() : "Research synthesis unavailable."
    await ctx.runMutation(internal.research.saveSynthesisMemory, { missionId: args.missionId, ownerKey: args.ownerKey, value: synthesis })
    return { ok: true, synthesis, sourceCount: rows.length }
  },
})

export const listForSynthesis = query({
  args: { missionId: v.id("missions") },
  returns: v.array(researchValidator),
  handler: async (ctx, args) => ctx.db.query("research").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").take(10),
})
