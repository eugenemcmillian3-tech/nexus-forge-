import { v } from "convex/values"
import { action, internalMutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { callMacalyJson } from "./macaly"

const artifactValidator = v.object({ _id: v.id("artifacts"), _creationTime: v.number(), missionId: v.id("missions"), type: v.string(), name: v.string(), content: v.string(), status: v.string(), requiresApproval: v.boolean() })

export const list = query({
  args: { missionId: v.id("missions") },
  returns: v.array(artifactValidator),
  handler: async (ctx, args) => ctx.db.query("artifacts").withIndex("by_mission", q => q.eq("missionId", args.missionId)).order("desc").take(20),
})

export const save = internalMutation({
  args: { missionId: v.id("missions"), type: v.string(), name: v.string(), content: v.string(), requiresApproval: v.boolean() },
  returns: v.id("artifacts"),
  handler: async (ctx, args) => ctx.db.insert("artifacts", { ...args, status: args.requiresApproval ? "awaiting_approval" : "ready" }),
})

export const generate = action({
  args: { missionId: v.id("missions"), mission: v.string(), artifactType: v.string(), artifactName: v.string() },
  returns: v.object({ ok: v.boolean(), artifactId: v.id("artifacts"), content: v.string() }),
  handler: async (ctx, args) => {
    const data = await callMacalyJson("/api/client-app/llm-usage", {
      preset: "CODE",
      messages: [
        { role: "system", content: "You are the NEXUS FORGE Builder Agent. Generate a useful artifact from the mission. Never claim it was deployed or published. Return only the artifact content." },
        { role: "user", content: `Mission: ${args.mission}\nArtifact type: ${args.artifactType}\nArtifact name: ${args.artifactName}\nCreate the complete first-pass artifact.` },
      ], maxTokens: 1800, temperature: 0.2,
    }) as { text?: unknown }
    const content = typeof data.text === "string" ? data.text.trim() : "Artifact generation returned no content."
    const artifactId = await ctx.runMutation(internal.artifacts.save, { missionId: args.missionId, type: args.artifactType, name: args.artifactName, content, requiresApproval: true })
    return { ok: true, artifactId, content }
  },
})
