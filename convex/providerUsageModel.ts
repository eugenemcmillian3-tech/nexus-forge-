import { v } from 'convex/values'
export const usageReport = v.object({ ordinal: v.number(), provider: v.string(), model: v.string(), promptTokens: v.optional(v.number()), completionTokens: v.optional(v.number()), totalTokens: v.optional(v.number()), reportedCostUsd: v.optional(v.number()), capturedAt: v.number() })
export const invocationFields = {
  ownerKey: v.string(), missionId: v.optional(v.id('missions')), missionRunId: v.optional(v.id('missionRuns')), stage: v.string(), role: v.string(), startedAt: v.number(),
  finishedAt: v.optional(v.number()), outcome: v.union(v.literal('pending'), v.literal('succeeded'), v.literal('failed')),
  usageStatus: v.union(v.literal('pending'), v.literal('recorded'), v.literal('missing'), v.literal('gap')),
  observedReports: v.optional(v.number()), reports: v.array(usageReport),
}
