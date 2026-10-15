// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { internal } from '../convex/_generated/api'
const modules = import.meta.glob('../convex/**/*.ts')
async function fixture() {
  const t = convexTest(schema, modules)
  const missionId = await t.run(c => c.db.insert('missions', { title: 'Recovery history', mission: 'Bounded admission', autonomy: 'guided', budget: 0, status: 'running', completion: 0, approved: true, ownerKey: 'history-owner' }))
  const missionRunId = await t.run(c => c.db.insert('missionRuns', { missionId, startedAt: Date.now(), deadlineAt: Date.now()+60000, maxRetries: 1, retries: 0, status: 'running', currentStage: 'council', nextActionAt: Date.now() }))
  return { t, missionId, missionRunId }
}
describe('recovery admission with accumulated history', () => {
  it('finds an uncertain lock after many completed claims and before replaying a cached result', async () => {
    const { t, missionId, missionRunId } = await fixture()
    await t.run(async c => {
      for (let i=0; i<250; i++) await c.db.insert('executionClaims', { missionId, scope: 'council', workKey: 'old:'+i, status: 'complete', result: '{}', createdAt: i })
      await c.db.insert('executionClaims', { missionId, scope: 'council', workKey: 'runner:'+missionRunId, status: 'complete', result: '{"saved":true}', createdAt: 251 })
      await c.db.insert('executionClaims', { missionId, scope: 'council', workKey: 'interrupted', status: 'uncertain', createdAt: 252 })
    })
    expect(await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'runner:'+missionRunId })).toEqual({ acquired: false, busy: 'uncertain' })
    expect(await t.query(internal.executionClaims.councilState, { missionId, runId: missionRunId })).toBe('complete')
    // A different scope remains independent of the Council lock.
    expect((await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'tick', workKey: 'tick:1' })).acquired).toBe(true)
  })
  it('rejects duplicate completed claim identities instead of arbitrarily replaying one', async () => {
    const { t, missionId } = await fixture()
    await t.run(async c => {
      for (let i=0; i<2; i++) await c.db.insert('executionClaims', { missionId, scope: 'council', workKey: 'duplicate', status: 'complete', result: String(i), createdAt: i })
    })
    await expect(t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'duplicate' })).rejects.toThrow()
  })
  it('rejects ambiguous provider history even when a successful answer exists', async () => {
    const { t, missionId, missionRunId } = await fixture()
    const identity = { ownerKey: 'history-owner', missionId, missionRunId, stage: 'target', role: 'planner' }
    const requestDigest = 'a'.repeat(64)
    await t.run(async c => {
      for (let i=0; i<250; i++) await c.db.insert('providerInvocations', { ...identity, stage: 'unrelated:'+i, outcome: 'succeeded', usageStatus: 'missing', startedAt: i, reports: [] })
      const invocationId = await c.db.insert('providerInvocations', { ...identity, outcome: 'succeeded', usageStatus: 'missing', startedAt: 251, reports: [] })
      await c.db.insert('providerResults', { invocationId, requestDigest, answer: 'Retained answer' })
      await c.db.insert('providerInvocations', { ...identity, outcome: 'pending', usageStatus: 'pending', startedAt: 252, reports: [] })
    })
    await expect(t.mutation(internal.providerRecovery.reserve, { ...identity, requestDigest })).rejects.toThrow(/ambiguous/)
    await expect(t.mutation(internal.providerUsage.begin, identity)).rejects.toThrow(/already pending/)
    expect((await t.mutation(internal.providerRecovery.reserve, { ...identity, stage: 'independent', requestDigest })).invocationId).toBeTruthy()
  })
})
