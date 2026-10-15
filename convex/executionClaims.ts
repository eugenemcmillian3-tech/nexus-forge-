import { v } from 'convex/values'
import { internalMutation, internalQuery, query } from './_generated/server'
import { requireOwnedMission } from './permissions'

export const councilState = internalQuery({
  args: { missionId: v.id('missions'), runId: v.id('missionRuns') },
  returns: v.union(v.null(), v.union(v.literal('running'), v.literal('uncertain'), v.literal('complete'))),
  handler: async (ctx, args) => {
    const claim = await ctx.db.query('executionClaims').withIndex('by_mission', q => q.eq('missionId', args.missionId)).filter(q => q.and(q.eq(q.field('scope'), 'council'), q.eq(q.field('workKey'), 'runner:' + args.runId))).unique()
    return claim?.status ?? null
  },
})
export const unresolved = query({
  args: { missionId: v.id('missions') },
  returns: v.array(v.object({ id: v.id('executionClaims'), scope: v.string(), status: v.string(), createdAt: v.number() })),
  handler: async (ctx, args) => {
    await requireOwnedMission(ctx, args.missionId)
    const rows = await ctx.db.query('executionClaims').withIndex('by_mission', q => q.eq('missionId', args.missionId)).filter(q => q.neq(q.field('status'), 'complete')).collect()
    return rows.map(row => ({ id: row._id, scope: row.scope, status: row.status, createdAt: row.createdAt }))
  },
})
export const acquire = internalMutation({
  args: { missionId: v.id('missions'), scope: v.union(v.literal('tick'), v.literal('council')), workKey: v.string() },
  returns: v.object({ acquired: v.boolean(), claimId: v.optional(v.id('executionClaims')), result: v.optional(v.string()), busy: v.optional(v.union(v.literal('running'), v.literal('uncertain'))) }),
  handler: async (ctx, args) => {
    if (!args.workKey || args.workKey.length > 256) throw new Error('Invalid execution identity')
    const mission = await ctx.db.get(args.missionId)
    if (!mission) throw new Error('Mission not found')
    const rows = await ctx.db.query('executionClaims').withIndex('by_mission', q => q.eq('missionId', args.missionId)).filter(q => q.eq(q.field('scope'), args.scope)).collect()
    // Never time out or steal a claim: the previous worker may still be executing.
    if (rows.some(row => row.status === 'uncertain')) return { acquired: false, busy: 'uncertain' as const }
    if (rows.some(row => row.status === 'running')) return { acquired: false, busy: 'running' as const }
    const complete = rows.find(row => row.workKey === args.workKey && row.status === 'complete')
    if (complete) return { acquired: false, result: complete.result }
    const claimId = await ctx.db.insert('executionClaims', { ...args, status: 'running', createdAt: Date.now() })
    return { acquired: true, claimId }
  },
})
export const finish = internalMutation({
  args: { claimId: v.id('executionClaims'), result: v.string(), retain: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (new TextEncoder().encode(args.result).length > 256 * 1024) throw new Error('Execution result exceeds recovery limit')
    const claim = await ctx.db.get(args.claimId)
    if (!claim || claim.status !== 'running') throw new Error('Execution claim is no longer active')
    if (args.retain) await ctx.db.patch(claim._id, { status: 'complete', result: args.result })
    else await ctx.db.delete(claim._id)
    return null
  },
})
export const uncertain = internalMutation({
  args: { claimId: v.id('executionClaims') }, returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId)
    if (claim?.status === 'running') await ctx.db.patch(claim._id, { status: 'uncertain' })
    return null
  },
})
