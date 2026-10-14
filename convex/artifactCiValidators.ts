import { v } from 'convex/values'
export const ciStepResults = v.array(v.array(v.object({ status: v.union(v.literal('pass'), v.literal('fail'), v.literal('not_run')), detail: v.string() })))
export const artifactCiState = v.object({
  branch: v.string(), commitSha: v.string(), snapshotSha: v.string(), bundlePath: v.string(), publishedAt: v.number(), dispatchedAt: v.optional(v.number()),
  runUrl: v.optional(v.string()), attempt: v.optional(v.number()), checkId: v.optional(v.number()), verifiedAt: v.optional(v.number()),
  outcome: v.optional(v.union(v.literal('passed'), v.literal('failed'), v.literal('partial'))), results: v.optional(ciStepResults),
})
