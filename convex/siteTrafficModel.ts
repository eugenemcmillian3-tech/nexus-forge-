import { ConvexError, v } from "convex/values"
export const trafficSite = "bphntw8kdojl9qvuifywyjtk.macaly.app"
export const trafficChat = "bphntw8kdojl9qvuifywyjtk"
export const trafficPeriod = { periodStart: v.number(), periodEnd: v.number() }
export const trafficMetrics = v.object({ visitors: v.number(), visits: v.number(), pageviews: v.number(), bounceRate: v.optional(v.number()), visitDuration: v.optional(v.number()) })
export const trafficSnapshot = { siteId: v.string(), ...trafficPeriod, metrics: trafficMetrics, rawResponse: v.string(), reportSha256: v.string() }
export const trafficFields = { ownerKey: v.string(), missionId: v.id("missions"), ...trafficSnapshot, sourceKey: v.string(), retrievedAt: v.number(), source: v.literal("macaly-site-analytics") }
export function validateTrafficPeriod(start: number, end: number, now: number) {
  if (![start, end].every(Number.isSafeInteger) || start < 0 || end <= start || end > now || end - start > 90 * 86400000) throw new ConvexError("Choose a completed period of at most 90 days with its end after its start.")
}
export function parseTrafficResponse(raw: string) {
  let body: { siteId?: unknown; data?: Record<string, { total?: unknown }> }
  try { body = JSON.parse(raw) } catch { throw new ConvexError("Analytics returned invalid JSON.") }
  if (!body || body.siteId !== trafficSite || !body.data || typeof body.data !== "object") throw new ConvexError("Analytics site identity or dashboard shape did not match.")
  const count = (key: string) => {
    const value = body.data?.[key]?.total
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new ConvexError("Analytics did not return a valid " + key + " count.")
    return value
  }
  const optional = (key: string, max: number) => {
    const value = body.data?.[key]?.total
    if (value === undefined || value === null) return undefined
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) throw new ConvexError("Analytics returned invalid " + key + " metadata.")
    return value
  }
  const bounceRate = optional("bounceRate", 1), visitDuration = optional("visitDuration", Number.MAX_SAFE_INTEGER)
  return { visitors: count("visitors"), visits: count("visits"), pageviews: count("pageviews"), ...(bounceRate === undefined ? {} : { bounceRate }), ...(visitDuration === undefined ? {} : { visitDuration }) }
}
