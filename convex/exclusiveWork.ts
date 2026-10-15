import { internal } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

export async function exclusiveWork<T>(ctx: Pick<ActionCtx, 'runMutation'>, options: { missionId: Id<'missions'>; scope: 'tick' | 'council'; workKey: string; retain: boolean; skipBusy?: boolean; onBusy?: () => Promise<void> }, work: (claimId: Id<'executionClaims'>) => Promise<T>): Promise<T | null> {
  const claim = await ctx.runMutation(internal.executionClaims.acquire, { missionId: options.missionId, scope: options.scope, workKey: options.workKey })
  if (claim.result !== undefined) return JSON.parse(claim.result) as T
  if (!claim.acquired || !claim.claimId) {
    if (options.skipBusy) {
      if (claim.busy === 'running') await options.onBusy?.()
      return null
    }
    throw new Error('Mission work is already active or uncertain; inspect recovery evidence before retrying')
  }
  return runClaimedWork(ctx, claim.claimId, options.retain, work)
}
export async function runClaimedWork<T>(ctx:Pick<ActionCtx,'runMutation'>,claimId:Id<'executionClaims'>,retain:boolean,work:(claimId:Id<'executionClaims'>)=>Promise<T>):Promise<T> {
  try {
    const result = await work(claimId)
    await ctx.runMutation(internal.executionClaims.finish, { claimId: claimId, result: JSON.stringify(result), retain: retain })
    return result
  } catch (error) {
    // No automatic release on error: remote work or a commit may have succeeded.
    // A lost finish acknowledgement can leave a completed result; uncertain is a no-op then.
    try { await ctx.runMutation(internal.executionClaims.uncertain, { claimId: claimId }) } catch { /* running remains reserved */ }
    throw error
  }
}
