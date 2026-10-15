import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

export async function assertClaim(ctx: MutationCtx, claimId: Id<'executionClaims'> | undefined, missionId: Id<'missions'>) {
  if (!claimId) return
  const claim = await ctx.db.get(claimId)
  if (!claim || claim.missionId !== missionId || claim.scope !== 'council' || claim.status !== 'running') throw new Error('Council execution claim is no longer active')
  const mission = await ctx.db.get(missionId)
  if (!mission?.approved || mission.status === 'complete' || mission.status === 'cancelled') throw new Error('Mission no longer permits Council writes')
  if (claim.workKey.startsWith('runner:')) {
    const runId = ctx.db.normalizeId('missionRuns', claim.workKey.slice(7))
    const run = runId ? await ctx.db.get(runId) : null
    if (!run || run.missionId !== missionId || run.status === 'blocked' || run.status === 'complete') throw new Error('Runner no longer permits Council writes')
  }
}
export async function claimEffect(ctx: MutationCtx, claimId: Id<'executionClaims'> | undefined, missionId: Id<'missions'>, effectKey: string, value: unknown): Promise<boolean> {
  if (!claimId) return true // legacy internal contract retained
  const payload = JSON.stringify(value)
  const claim = await ctx.db.get(claimId)
  if (!claim || claim.missionId !== missionId || claim.scope !== 'council') throw new Error('Council execution claim does not match mission')
  const existing = await ctx.db.query('executionEffects').withIndex('by_claimId_and_effectKey', q => q.eq('claimId', claimId).eq('effectKey', effectKey)).unique()
  if (existing) {
    if (existing.payload !== payload) throw new Error('Conflicting execution effect')
    return false
  }
  await assertClaim(ctx, claimId, missionId)
  await ctx.db.insert('executionEffects', { claimId, effectKey, payload })
  return true
}
