import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

// Checked in the same transaction as provider admission. Retired workers cannot
// create a reservation after an unstarted retry is authorized.
export async function checkProviderClaim(ctx: MutationCtx, args: { missionId?: Id<'missions'>; missionRunId?: Id<'missionRuns'>; stage: string; executionClaimId?: Id<'executionClaims'> }) {
  const runnerCouncil = !!args.missionRunId && args.stage.startsWith('council-')
  if (!args.executionClaimId && !runnerCouncil) return
  if (!args.executionClaimId) throw new Error('Council provider reservation requires its execution claim')
  const claim = await ctx.db.get('executionClaims', args.executionClaimId)
  if (!claim || claim.missionId !== args.missionId || claim.scope !== 'council' || claim.status !== 'running') throw new Error('Council execution claim is no longer active')
  const mission = args.missionId ? await ctx.db.get('missions', args.missionId) : null
  if (!mission?.approved || mission.status === 'complete' || mission.status === 'cancelled') throw new Error('Mission no longer permits Council inference')
  if (args.missionRunId) {
    const run = await ctx.db.get('missionRuns', args.missionRunId)
    if (!run || run.missionId !== mission._id || run.status === 'blocked' || run.status === 'complete' || Date.now() >= run.deadlineAt) throw new Error('Runner no longer permits Council inference')
  }
  if (args.missionRunId && claim.workKey !== 'runner:'+args.missionRunId) throw new Error('Council claim does not match runner')
  if (!args.missionRunId && !claim.workKey.startsWith('direct:')) throw new Error('Council claim does not match direct invocation')
}
