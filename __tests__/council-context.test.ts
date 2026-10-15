// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { internal } from '../convex/_generated/api'
const modules = import.meta.glob('../convex/**/*.ts')
async function fixture() {
  const t = convexTest(schema, modules)
  const missionId = await t.run(c => c.db.insert('missions', { title: 'Snapshot', mission: 'Original mission', autonomy: 'guided', budget: 0, status: 'running', completion: 0, approved: true, ownerKey: 'context-owner' }))
  const claim = await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'direct:test' })
  const args = { missionId, executionClaimId: claim.claimId!, missionText: 'Original mission', corpusCutoff: Date.now(), selected: [], researchContext: 'Original research', learningContext: 'Original learning', preflightContext: 'Original preflight' }
  return { t, missionId, args }
}
describe('immutable Council context', () => {
  it('retains exact inputs and retries the same receipt after source changes', async () => {
    const { t, missionId, args } = await fixture()
    const receiptId = await t.mutation(internal.memory.recordCouncilMemorySelection, args)
    await t.run(c => c.db.patch(missionId, { mission: 'Changed after capture' }))
    expect(await t.mutation(internal.memory.recordCouncilMemorySelection, args)).toBe(receiptId)
    await expect(t.mutation(internal.memory.recordCouncilMemorySelection, { ...args, researchContext: 'Changed research' })).rejects.toThrow(/immutable/)
    const snapshots = await t.run(c => c.db.query('executionEffects').filter(q => q.eq(q.field('effectKey'), 'council-context:v1')).collect())
    expect(snapshots).toHaveLength(1)
    expect(JSON.parse(snapshots[0].payload)).toEqual({ context: { missionText: args.missionText, researchContext: args.researchContext, learningContext: args.learningContext, preflightContext: args.preflightContext }, memoryReceiptId: receiptId })
    expect(await t.run(c => c.db.query('councilMemoryReceipts').collect())).toHaveLength(1)
  })
  it('rejects changed mission text and mismatched claim without leaving partial receipts', async () => {
    const { t, missionId, args } = await fixture()
    const otherId = await t.run(c => c.db.insert('missions', { title: 'Other', mission: args.missionText, autonomy: 'guided', budget: 0, status: 'running', completion: 0, approved: true, ownerKey: 'other-owner' }))
    await expect(t.mutation(internal.memory.recordCouncilMemorySelection, { ...args, missionId: otherId })).rejects.toThrow(/not active/)
    await t.run(c => c.db.patch(missionId, { mission: 'Changed before capture' }))
    await expect(t.mutation(internal.memory.recordCouncilMemorySelection, args)).rejects.toThrow(/Mission changed/)
    expect(await t.run(c => c.db.query('councilMemoryReceipts').collect())).toEqual([])
  })
  it('rejects uncertain claims and oversized UTF-8 payloads', async () => {
    const { t, args } = await fixture()
    await expect(t.mutation(internal.memory.recordCouncilMemorySelection, { ...args, researchContext: '界'.repeat(180000) })).rejects.toThrow(/limit/)
    await t.mutation(internal.executionClaims.uncertain, { claimId: args.executionClaimId })
    await expect(t.mutation(internal.memory.recordCouncilMemorySelection, args)).rejects.toThrow(/not active/)
    expect(await t.run(c => c.db.query('councilMemoryReceipts').collect())).toEqual([])
  })
})
