"use node"
import { createHash } from "node:crypto"
import { Buffer } from "node:buffer"
import { ConvexError, v } from "convex/values"
import { action, internalAction } from "./_generated/server"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { parseTrafficResponse, trafficChat, trafficPeriod, trafficSite, trafficSnapshot, validateTrafficPeriod } from "./siteTrafficModel"

export const readDashboard = internalAction({
  args: trafficPeriod, returns: v.object(trafficSnapshot),
  handler: async (_ctx, args) => {
    validateTrafficPeriod(args.periodStart, args.periodEnd, Date.now())
    const base = process.env.MACALY_BASE_URL, token = process.env.MACALY_API_TOKEN
    if (!base || !token || process.env.MACALY_CHAT_ID !== trafficChat) throw new ConvexError("Managed analytics connection is unavailable. Reapply the project's managed Convex environment.")
    const endpoint = new URL("/api/client-app/analytics", base)
    if (endpoint.protocol !== "https:") throw new ConvexError("Managed analytics endpoint must use HTTPS.")
    const headers: Record<string, string> = { Authorization: "Bearer " + token, "Content-Type": "application/json" }
    const bypass = process.env.MACALY_BYPASS_HEADER
    if (bypass) { const split = bypass.indexOf(":"); if (split > 0) headers[bypass.slice(0, split).trim()] = bypass.slice(split + 1).trim() }
    let response: Response
    try { response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ chatId: trafficChat, queryType: "get-dashboard-data-v2", domain: trafficSite, period: { from: args.periodStart, to: args.periodEnd } }), redirect: "error", signal: AbortSignal.timeout(20000) }) }
    catch { throw new ConvexError("Managed analytics request failed. Retry after checking connection health.") }
    if (!response.ok) throw new ConvexError("Managed analytics lookup failed (HTTP " + response.status + "). A 403 may require reapplying the managed Convex environment.")
    const reader = response.body?.getReader()
    if (!reader) throw new ConvexError("Analytics returned an empty response.")
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 32768) { await reader.cancel(); throw new Error("size") }; chunks.push(value) }
    } catch { throw new ConvexError("Analytics response was incomplete or exceeded 32 KiB.") }
    const bytes = Buffer.concat(chunks)
    let rawResponse: string
    try { rawResponse = new TextDecoder("utf-8", { fatal: true }).decode(bytes) } catch { throw new ConvexError("Analytics returned invalid UTF-8.") }
    return { ...args, siteId: trafficSite, metrics: parseTrafficResponse(rawResponse), rawResponse, reportSha256: createHash("sha256").update(bytes).digest("hex") }
  },
})
export const retrieveAndSave = action({
  args: { missionId: v.id("missions"), ...trafficPeriod, acknowledgeSiteScope: v.boolean() }, returns: v.id("siteTrafficReceipts"),
  handler: async (ctx, args): Promise<Id<"siteTrafficReceipts">> => {
    await ctx.runQuery(api.missions.getById, { id: args.missionId })
    if (!args.acknowledgeSiteScope) throw new ConvexError("Confirm these are site-wide NEXUS FORGE traffic counts, not mission-attributed product results.")
    const snapshot: { siteId: string; periodStart: number; periodEnd: number; metrics: { visitors: number; visits: number; pageviews: number; bounceRate?: number; visitDuration?: number }; rawResponse: string; reportSha256: string } = await ctx.runAction(internal.siteTraffic.readDashboard, { periodStart: args.periodStart, periodEnd: args.periodEnd })
    return ctx.runMutation(internal.verification.saveTrafficInternal, { ...snapshot, missionId: args.missionId })
  },
})
