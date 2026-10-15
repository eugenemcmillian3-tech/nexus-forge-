// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'
const modules = import.meta.glob('../convex/**/*.ts')
async function fixture() {
  const t = convexTest(schema, modules)
  const owner = t.withIdentity({ subject: 'retry-owner', issuer: 'https://retry.test', tokenIdentifier: 'https://retry.test|retry-owner' })
  const missionId = await t.run(c => c.db.insert('missions', { title: 'Unstarted', mission: 'Verify retry boundary', ownerKey: 'retry-owner', autonomy: 'guided', budget: 1, status: 'running', completion: 0, approved: true }))
  const runId = await t.run(c => c.db.insert('missionRuns', { missionId, status: 'paused', currentStage: 'execution_recovery', startedAt: Date.now(), deadlineAt: Date.now()+60000, maxRetries: 1, retries: 0, nextActionAt: Date.now() }))
  const claim = await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'runner:'+runId })
  await t.mutation(internal.executionClaims.uncertain, { claimId: claim.claimId! })
  const provider = { ownerKey: 'retry-owner', missionId, missionRunId: runId, stage: 'council-plan', role: 'planner', requestDigest: 'a'.repeat(64) }
  const decision = async () => {
    const view = await owner.query(api.executionReview.evidence, { claimId: claim.claimId! })
    return { claimId: claim.claimId!, evidenceToken: view.evidenceToken, decision: 'retry-unstarted' as const, note: 'Verified no provider admission or Council effects before retry.' }
  }
  return { t, owner, missionId, runId, claimId: claim.claimId!, provider, decision }
}
describe('unstarted Council retry', () => {
  it('retires only the old token, preserves the deadline and fences delayed workers', async () => {
    const { t, owner, missionId, runId, claimId, provider, decision } = await fixture()
    const deadline = await t.run(async c => (await c.db.get('missionRuns', runId))!.deadlineAt)
    expect((await owner.query(api.executionReview.evidence, { claimId })).retryBlock).toBeNull()
    await owner.mutation(api.executionReview.record, await decision())
    expect(await t.run(c => c.db.get('executionClaims', claimId))).toBeNull()
    expect((await t.run(c => c.db.get('missionRuns', runId)))?.deadlineAt).toBe(deadline)
    expect((await t.run(c => c.db.get('missionRuns', runId)))?.retries).toBe(1)
    await expect(t.mutation(internal.providerRecovery.reserve, { ...provider, executionClaimId: claimId })).rejects.toThrow(/no longer active/)
    await expect(t.mutation(internal.providerRecovery.reserve, provider)).rejects.toThrow(/requires its execution claim/)
    await expect(t.mutation(internal.forge.recordAgentEvidence, { missionId, executionClaimId: claimId, agent: 'Late worker', message: 'Stale result', score: 1, severity: 'verified' })).rejects.toThrow()
    const replacement = await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'runner:'+runId })
    expect(replacement.claimId).not.toBe(claimId)
    await expect(t.mutation(internal.providerRecovery.reserve, { ...provider, executionClaimId: claimId })).rejects.toThrow()
    expect((await t.mutation(internal.providerRecovery.reserve, { ...provider, executionClaimId: replacement.claimId! })).invocationId).toBeTruthy()
    expect(await t.run(c => c.db.query('auditEvents').collect())).toHaveLength(1)
  })
  it('rejects retry when provider admission precedes the retirement transaction', async () => {
    const { t, owner, claimId, provider, decision } = await fixture()
    const args = await decision()
    // Simulate a reservation already admitted before the interruption was recorded.
    await t.run(c => c.db.insert('providerInvocations', { ownerKey: provider.ownerKey, missionId: provider.missionId, missionRunId: provider.missionRunId, stage: provider.stage, role: provider.role, startedAt: Date.now(), outcome: 'pending', usageStatus: 'pending', reports: [] }))
    await expect(owner.mutation(api.executionReview.record, args)).rejects.toThrow(/evidence changed/)
    const current = await decision()
    await expect(owner.mutation(api.executionReview.record, current)).rejects.toThrow(/admitted provider work/)
    expect((await t.run(c => c.db.get('executionClaims', claimId)))?.status).toBe('uncertain')
  })
  it('blocks saved effects, competing workers, expired runs and direct claims', async () => {
    const { t, owner, missionId, runId, claimId } = await fixture()
    const effectId = await t.run(c => c.db.insert('executionEffects', { claimId, effectKey: 'council-context:v1', payload: '{}' }))
    expect((await owner.query(api.executionReview.evidence, { claimId })).retryBlock).toMatch(/context or Council effects/)
    await t.run(c => c.db.delete(effectId))
    const tick = await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'tick', workKey: 'competing' })
    expect((await owner.query(api.executionReview.evidence, { claimId })).retryBlock).toMatch(/Another mission execution/)
    await t.mutation(internal.executionClaims.finish, { claimId: tick.claimId!, result: 'null', retain: false })
    const decisionId = await t.run(c => c.db.insert('portfolioDecisions', { missionId, priorityRank: 1, action: 'review', decision: 'reject', createdAt: Date.now() }))
    expect((await owner.query(api.executionReview.evidence, { claimId })).retryBlock).toMatch(/portfolio decision/)
    await t.run(c => c.db.delete(decisionId))
    const resourceId = await t.run(c => c.db.insert('missionResources', { missionId, resourceKey: 'shared-review', mode: 'shared', status: 'released' }))
    expect((await owner.query(api.executionReview.evidence, { claimId })).retryBlock).toMatch(/Resource requirements/)
    await t.run(c => c.db.delete(resourceId))
    await t.run(c => c.db.patch(runId, { retries: 1 }))
    expect((await owner.query(api.executionReview.evidence, { claimId })).retryBlock).toMatch(/allowance is exhausted/)
    await t.run(c => c.db.patch(runId, { retries: 0, deadlineAt: Date.now()-1 }))
    expect((await owner.query(api.executionReview.evidence, { claimId })).retryBlock).toMatch(/deadline/)
    await t.run(c => c.db.patch(claimId, { workKey: 'direct:legacy' }))
    expect((await owner.query(api.executionReview.evidence, { claimId })).retryBlock).toMatch(/runner Council/)
  })
})
