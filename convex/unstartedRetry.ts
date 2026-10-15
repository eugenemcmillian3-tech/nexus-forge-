import type { QueryCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'

// A proof of no admitted work, not a timeout or operator assertion of quiescence.
export async function unstartedRetryBlock(ctx: Pick<QueryCtx, 'db'>, claim: Doc<'executionClaims'>): Promise<string | null> {
  if (claim.status !== 'uncertain' || claim.scope !== 'council' || !claim.workKey.startsWith('runner:')) return 'Only an uncertain runner Council claim is eligible.'
  const runId = ctx.db.normalizeId('missionRuns', claim.workKey.slice(7))
  const run = runId ? await ctx.db.get('missionRuns', runId) : null
  const mission = await ctx.db.get('missions', claim.missionId)
  if (!run || !mission || run.missionId !== mission._id || !mission.approved || mission.status === 'complete' || mission.status === 'cancelled') return 'Mission or runner no longer permits execution.'
  if (run.status !== 'paused' || run.currentStage !== 'execution_recovery' || Date.now() >= run.deadlineAt) return 'The runner must be paused for execution recovery within its original deadline.'
  if (run.retries >= run.maxRetries) return 'The original retry allowance is exhausted.'
  const latest = await ctx.db.query('missionRuns').withIndex('by_mission', q => q.eq('missionId', mission._id)).order('desc').first()
  if (latest?._id !== run._id) return 'A newer mission run exists.'
  const portfolio = await ctx.db.query('portfolioDecisions').withIndex('by_mission', q => q.eq('missionId', mission._id)).order('desc').first()
  if (portfolio && portfolio.decision !== 'approve') return 'The current portfolio decision does not authorize retry.'
  if (await ctx.db.query('missionDependencies').withIndex('by_mission', q => q.eq('missionId', mission._id)).first()) return 'Dependency requirements need a separate preflight review.'
  if (await ctx.db.query('missionResources').withIndex('by_mission', q => q.eq('missionId', mission._id)).first()) return 'Resource requirements need a separate preflight review.'
  const invocation = await ctx.db.query('providerInvocations').withIndex('by_missionRunId_and_stage_and_role_and_outcome', q => q.eq('missionRunId', run._id)).first()
  if (invocation) return 'This runner has admitted provider work; reconcile its outcome before any retry.'
  const effects = await ctx.db.query('executionEffects').withIndex('by_claim', q => q.eq('claimId', claim._id)).take(2)
  if (effects.some(effect => effect.effectKey !== 'recovery-review:v1')) return 'Saved context or Council effects already exist; this is not unstarted work.'
  if (await ctx.db.query('artifacts').withIndex('by_mission', q => q.eq('missionId', mission._id)).first()) return 'Mission artifacts already exist.'
  if (await ctx.db.query('deliveries').withIndex('by_mission', q => q.eq('missionId', mission._id)).first()) return 'Mission deliveries already exist.'
  const incidents = await ctx.db.query('incidents').withIndex('by_mission', q => q.eq('missionId', mission._id)).take(51)
  if (incidents.length > 50 || incidents.some(row => row.status === 'escalated')) return 'Escalation history requires separate resolution.'
  for (const scope of ['tick', 'council'] as const) {
    for (const status of ['running', 'uncertain'] as const) {
      const locks = await ctx.db.query('executionClaims').withIndex('by_missionId_and_scope_and_status', q => q.eq('missionId', mission._id).eq('scope', scope).eq('status', status)).take(2)
      if (locks.some(lock => lock._id !== claim._id)) return 'Another mission execution is active or uncertain.'
    }
  }
  return null
}
