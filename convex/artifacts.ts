import { v } from "convex/values"
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { callMacalyJson } from "./macaly"
import { requireOperator } from "./permissions"

const artifactValidator = v.object({ _id: v.id("artifacts"), _creationTime: v.number(), missionId: v.id("missions"), type: v.string(), name: v.string(), content: v.string(), status: v.string(), requiresApproval: v.boolean() })

export const getInternal = internalQuery({ args: { id: v.id("artifacts") }, returns: v.union(artifactValidator, v.null()), handler: async (ctx, args) => ctx.db.get(args.id) })
export const list = query({ args: { missionId: v.id("missions") }, returns: v.array(artifactValidator), handler: async (ctx, args) => ctx.db.query("artifacts").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").take(20) })
export const save = internalMutation({ args: { missionId: v.id("missions"), type: v.string(), name: v.string(), content: v.string(), requiresApproval: v.boolean() }, returns: v.id("artifacts"), handler: async (ctx, args) => ctx.db.insert("artifacts", { ...args, status: args.requiresApproval ? "awaiting_approval" : "ready" }) })

export const approve = mutation({
  args: { id: v.id("artifacts"), approved: v.boolean() }, returns: v.null(),
  handler: async (ctx, args) => {
    await requireOperator(ctx)
    const artifact = await ctx.db.get("artifacts", args.id)
    if (!artifact) throw new Error("Artifact not found")
    if (!artifact.requiresApproval) throw new Error("This artifact does not require approval")
    if (args.approved && artifact.status !== "verified") throw new Error("Artifact verification must pass before human approval")
    await ctx.db.patch(args.id, { status: args.approved ? "ready" : "rejected", requiresApproval: false })
    await ctx.runMutation(internal.audit.record, { missionId: artifact.missionId, type: "artifact", action: args.approved ? "artifact_approved" : "artifact_rejected", status: args.approved ? "approved" : "rejected", detail: args.approved ? `Human approved verified artifact: ${artifact.name}.` : `Human rejected artifact: ${artifact.name}.` })
    return null
  },
})

export const verify = mutation({
  args: { id: v.id("artifacts") }, returns: v.object({ passed: v.boolean(), score: v.number(), checks: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get("artifacts", args.id)
    if (!artifact) throw new Error("Artifact not found")
    const text = artifact.content.trim(), lower = text.toLowerCase()
    const checks = [
      !/^```/i.test(text) && text.length >= 500 ? "Complete artifact content is present" : "Artifact content is too short",
      /(<!doctype html|<html[\s>])/i.test(text) ? "Runnable HTML document detected" : "Runnable HTML document missing",
      /<style[\s>]|<link[^>]+stylesheet/i.test(text) ? "Presentation layer detected" : "Presentation layer missing",
      /<script[\s>]/i.test(text) ? "Interactive behavior layer detected" : "Interactive behavior layer missing",
      /(readiness|ready|needs review|not ready)/i.test(lower) ? "Readiness classification detected" : "Readiness classification missing",
      /(20|100).*(score|points)|score.*(20|100)/i.test(lower) ? "Scoring logic/content detected" : "Scoring logic missing",
      /(yes|no|needs review)/i.test(lower) ? "Required response choices detected" : "Required response choices missing",
      /(test|validation|acceptance)/i.test(lower) ? "Validation or acceptance evidence included" : "Validation evidence missing",
    ]
    const passedCount = checks.filter(c => !c.includes("missing") && !c.includes("too short")).length
    const passed = passedCount === checks.length, score = passedCount / checks.length
    await ctx.db.patch(args.id, { status: passed ? "verified" : "verification_failed" })
    await ctx.runMutation(internal.audit.record, { missionId: artifact.missionId, type: "artifact", action: passed ? "artifact_verified" : "artifact_verification_failed", status: passed ? "verified" : "failed", detail: `Artifact verification ${passed ? "passed" : "failed"} at ${Math.round(score * 100)}%. ${checks.join(" | ")}` })
    return { passed, score, checks }
  },
})

export const generate = action({
  args: { missionId: v.id("missions"), mission: v.string(), artifactType: v.string(), artifactName: v.string() },
  returns: v.object({ ok: v.boolean(), artifactId: v.id("artifacts"), content: v.string() }),
  handler: async (ctx, args) => {
    const operator = await ctx.runQuery(internal.permissions.currentOperator, {})
    if (!operator) throw new Error("Authenticated operator session required")
    const data = await callMacalyJson("/api/client-app/llm-usage", { preset: "CODE", messages: [{ role: "system", content: "You are the NEXUS FORGE Builder Agent. Produce the actual first-pass implementation, not a blueprint, proposal, pseudocode, checklist, or architecture description. For a web-app mission, return ONE complete self-contained HTML document containing semantic HTML, embedded CSS, embedded JavaScript, validation behavior, and requested acceptance logic. It must be runnable by saving the response as index.html. Do not claim deployment or external execution. Include a small visible verification/help section describing the acceptance checks implemented. Return only the artifact source." }, { role: "user", content: `Mission: ${args.mission}\nArtifact type: ${args.artifactType}\nArtifact name: ${args.artifactName}\nCreate the complete runnable implementation. Implement every explicit requirement including scoring/classification, user interaction, validation, responsive presentation, and acceptance evidence. Do not output a plan.` }], maxTokens: 6000, temperature: 0.15 }) as { text?: unknown }
    const rawContent = typeof data.text === "string" ? data.text.trim() : ""
    const content = rawContent.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim()
    if (!content) throw new Error("Builder returned no artifact content")
    const artifactId = await ctx.runMutation(internal.artifacts.save, { missionId: args.missionId, type: args.artifactType, name: args.artifactName, content, requiresApproval: true })
    return { ok: true, artifactId, content }
  },
})
