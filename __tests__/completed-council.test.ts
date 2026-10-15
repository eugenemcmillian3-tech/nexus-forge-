// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
const modules = import.meta.glob('../convex/**/*.ts')
const stages = ['council-plan', 'council-Vision Architect', 'council-Research Oracle', 'council-Systems Engineer', 'council-Builder Agent', 'council-Creative Director', 'council-critic', 'council-decision']
async function fixture() {
  const t = convexTest(schema, modules), owner = t.withIdentity({ subject: 'reconcile-owner', issuer: 'https://reconcile.test', tokenIdentifier: 'https://reconcile.test|reconcile-owner' })
  const missionId = await t.run(c => c.db.insert('missions', { ownerKey: 'reconcile-owner', title: 'Reconcile', mission: 'Original context', autonomy: 'guided', budget: 1, status: 'review', completion: 40, approved: true }))
  const runId = await t.run(c => c.db.insert('missionRuns', { missionId, startedAt: Date.now(), deadlineAt: Date.now()+60000, maxRetries: 2, retries: 0, status: 'paused', currentStage: 'execution_recovery', nextActionAt: Date.now() }))
  const claim = await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'runner:'+runId })
  await t.mutation(internal.forge.createRuns, { missionId })
  const receiptId = await t.mutation(internal.memory.recordCouncilMemorySelection, { missionId, missionText: 'Original context', selected: [], corpusCutoff: Date.now(), learningContext: 'Learning', preflightContext: 'Preflight', executionClaimId: claim.claimId!, researchContext: 'Research' })
  await t.mutation(internal.memory.markCouncilPlannerResponded, { receiptId })
  const ids = await t.run(async c => {
    const ids: Id<'providerInvocations'>[] = []
    for (const stage of stages) {
      const id = await c.db.insert('providerInvocations', { missionId, missionRunId: runId, ownerKey: 'reconcile-owner', stage, role: 'controlled', startedAt: Date.now(), outcome: 'succeeded', usageStatus: 'recorded', reports: [] })
      await c.db.insert('providerResults', { invocationId: id, requestDigest: 'a'.repeat(64), answer: 'Private retained provider answer' }); ids.push(id)
    }
    const runs = await c.db.query('agentRuns').collect()
    for (const row of runs) await c.db.patch(row._id, { status: 'complete', progress: 100 })
    return ids
  })
  await t.mutation(internal.forge.recordCouncilResult, { missionId, executionClaimId: claim.claimId!, summary: 'Persisted final Council summary' })
  await t.mutation(internal.executionClaims.uncertain, { claimId: claim.claimId! })
  const review = async () => {
    const view = await owner.query(api.executionReview.evidence, { claimId: claim.claimId! })
    return { claimId: claim.claimId!, evidenceToken: view.evidenceToken, decision: 'confirm-completion' as const, note: 'Confirmed final receipt, all durable answers and completed agent handoffs.' }
  }
  return { t, owner, missionId, runId, claimId: claim.claimId!, ids, review }
}
describe('retained final Council reconciliation', () => {
  it('confirms saved completion without inference, workflow advance or duplicated effects', async () => {
    const { t, owner, missionId, runId, claimId, review } = await fixture()
    const beforeRun = await t.run(c => c.db.get('missionRuns', runId))
    const before = await owner.query(api.executionReview.evidence, { claimId })
    expect(before.completionBlock).toBeNull()
    expect(JSON.stringify(before)).not.toContain('Private retained provider answer')
    await owner.mutation(api.executionReview.record, await review())
    const claim = await t.run(c => c.db.get('executionClaims', claimId))
    expect(claim?.status).toBe('complete')
    expect(JSON.parse(claim!.result!)).toEqual({ ok: true, summary: 'Persisted final Council summary' })
    expect(await t.run(c => c.db.get('missionRuns', runId))).toEqual(beforeRun)
    expect(await t.run(c => c.db.query('providerInvocations').collect())).toHaveLength(8)
    expect(await t.run(c => c.db.query('auditEvents').collect())).toHaveLength(1)
    expect((await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'runner:'+runId })).result).toBe(claim!.result)
  })
  it('rejects pending or missing durable answers and changed mission context', async () => {
    const { t, owner, missionId, claimId, ids, review } = await fixture()
    const initial = await review()
    await t.run(c => c.db.patch(ids[0], { outcome: 'pending' }))
    await expect(owner.mutation(api.executionReview.record, initial)).rejects.toThrow(/evidence changed/)
    expect((await owner.query(api.executionReview.evidence, { claimId })).completionBlock).toMatch(/successful outcomes/)
    await t.run(c => c.db.patch(ids[0], { outcome: 'succeeded' }))
    await t.run(async c => { const result = await c.db.query('providerResults').withIndex('by_invocation', q => q.eq('invocationId', ids[0])).unique(); await c.db.delete(result!._id) })
    expect((await owner.query(api.executionReview.evidence, { claimId })).completionBlock).toMatch(/durable answer/)
    await t.run(c => c.db.patch(missionId, { mission: 'Changed context' }))
    expect((await owner.query(api.executionReview.evidence, { claimId })).completionBlock).toMatch(/inputs and planner receipt/)
  })
  it('rejects absent final receipt and incomplete agents', async () => {
    const { t, owner, claimId, review } = await fixture()
    await t.run(async c => { const row = await c.db.query('agentRuns').first(); await c.db.patch(row!._id, { status: 'blocked' }) })
    expect((await owner.query(api.executionReview.evidence, { claimId })).completionBlock).toMatch(/six Council agents/)
    await expect(owner.mutation(api.executionReview.record, await review())).rejects.toThrow(/six Council agents/)
    await t.run(async c => { const row = await c.db.query('executionEffects').withIndex('by_claimId_and_effectKey', q => q.eq('claimId', claimId).eq('effectKey', 'council-result')).unique(); await c.db.delete(row!._id) })
    expect((await owner.query(api.executionReview.evidence, { claimId })).completionBlock).toMatch(/final result/)
  })
})
