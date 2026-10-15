import { v, ConvexError } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requireOwnedMission } from './permissions'

async function inspect(ctx: Pick<QueryCtx, 'db' | 'auth'>, claimId: Id<'executionClaims'>) {
  const claim = await ctx.db.get('executionClaims', claimId)
  if (!claim) throw new ConvexError('Execution claim not found or access denied')
  const mission = await requireOwnedMission(ctx, claim.missionId)
  const effects = await ctx.db.query('executionEffects').withIndex('by_claim', q => q.eq('claimId', claimId)).take(11)
  const snapshot = await ctx.db.query('executionEffects').withIndex('by_claimId_and_effectKey', q => q.eq('claimId', claimId).eq('effectKey', 'council-context:v1')).unique()
  const review = await ctx.db.query('executionEffects').withIndex('by_claimId_and_effectKey', q => q.eq('claimId', claimId).eq('effectKey', 'recovery-review:v1')).unique()
  const runId = claim.workKey.startsWith('runner:') ? ctx.db.normalizeId('missionRuns', claim.workKey.slice(7)) : null
  const run = runId ? await ctx.db.get('missionRuns', runId) : null
  const runMatches = !!run && run.missionId === claim.missionId
  const rows = runId && runMatches ? await ctx.db.query('providerInvocations')
    .withIndex('by_missionRunId_and_stage_and_role_and_outcome', q => q.eq('missionRunId', runId).gte('stage', 'council-').lt('stage', 'council.')).take(11) : []
  const invocations = await Promise.all(rows.slice(0, 10).map(async row => {
    if (row.missionId !== claim.missionId || row.ownerKey !== mission.ownerKey) throw new ConvexError('Provider evidence does not match mission')
    const result = await ctx.db.query('providerResults').withIndex('by_invocation', q => q.eq('invocationId', row._id)).unique()
    return { id: row._id, stage: row.stage, outcome: row.outcome, usageStatus: row.usageStatus, recoverable: row.outcome === 'succeeded' && !!result, reports: row.reports.length, finishedAt: row.finishedAt ?? null }
  }))
  const effectsTruncated = effects.length > 10, invocationsTruncated = rows.length > 10
  // Token represents exactly the bounded evidence displayed, excluding review notes.
  // It is compared transactionally, not treated as authorization.
  const evidenceToken = JSON.stringify([claim.status, snapshot?._id ?? null, runMatches ? run!.status : null, invocations, effects.slice(0, 10).filter(e => e.effectKey !== 'recovery-review:v1').map(e => e._id), effectsTruncated, invocationsTruncated])
  let context: string | null = null
  if (snapshot) {
    try {
      const saved = JSON.parse(snapshot.payload)
      if (saved.context && typeof saved.memoryReceiptId === 'string') context = JSON.stringify(saved.context, null, 2)
    } catch { /* Malformed retained data is shown as unavailable. */ }
  }
  let lastReview: { decision: string; note: string; recordedAt: number } | null = null
  if (review) {
    try { const saved = JSON.parse(review.payload); if (typeof saved.decision === 'string' && typeof saved.note === 'string' && typeof saved.recordedAt === 'number') lastReview = saved } catch { /* Legacy payload is unavailable. */ }
  }
  return { claim, review, context, lastReview, invocations, effectsTruncated, invocationsTruncated, evidenceToken,
    effectCount: Math.min(effects.length, 10), providerScope: runMatches ? 'runner-council' : 'unattributed-direct-or-missing-run' }
}
const invocation = v.object({ id: v.id('providerInvocations'), stage: v.string(), outcome: v.string(), usageStatus: v.string(), recoverable: v.boolean(), reports: v.number(), finishedAt: v.union(v.number(), v.null()) })
export const evidence = query({
  args: { claimId: v.id('executionClaims') },
  returns: v.object({ status: v.string(), scope: v.string(), context: v.union(v.string(), v.null()), lastReview: v.union(v.null(), v.object({ decision: v.string(), note: v.string(), recordedAt: v.number() })), invocations: v.array(invocation), effectsTruncated: v.boolean(), invocationsTruncated: v.boolean(), evidenceToken: v.string(), effectCount: v.number(), providerScope: v.string() }),
  handler: async (ctx, args) => {
    const result = await inspect(ctx, args.claimId)
    const { claim, review: _review, ...visible } = result
    return { ...visible, status: claim.status, scope: claim.scope }
  },
})
export const record = mutation({
  args: { claimId: v.id('executionClaims'), evidenceToken: v.string(), decision: v.union(v.literal('hold'), v.literal('escalate')), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = args.note.trim()
    if (note.length < 20 || note.length > 2000 || args.evidenceToken.length > 40000) throw new ConvexError('Explain the reviewed evidence in 20–2,000 characters')
    const result = await inspect(ctx, args.claimId)
    if (result.claim.status !== 'uncertain') throw new ConvexError('Only uncertain work can receive a recovery decision')
    if (result.evidenceToken !== args.evidenceToken) throw new ConvexError('Execution evidence changed. Review the current evidence before saving')
    if (result.lastReview?.decision === args.decision && result.lastReview.note === note) return null
    const payload = JSON.stringify({ decision: args.decision, note, recordedAt: Date.now() })
    if (result.review) await ctx.db.patch(result.review._id, { payload })
    else await ctx.db.insert('executionEffects', { claimId: args.claimId, effectKey: 'recovery-review:v1', payload })
    await ctx.db.insert('auditEvents', { missionId: result.claim.missionId, eventType: 'execution-recovery-review', source: 'operator', message: args.decision === 'hold' ? 'Operator reviewed execution evidence; claim remains blocked.' : 'Operator escalated execution review; claim remains blocked.', metadata: JSON.stringify({ claimId: args.claimId, decision: args.decision, note }), createdAt: Date.now() })
    return null
  },
})
