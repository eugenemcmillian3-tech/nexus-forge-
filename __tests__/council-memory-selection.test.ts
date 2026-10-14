import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'
import { callAiProvider } from '../convex/aiProvider'
import type { Id } from '../convex/_generated/dataModel'
vi.mock('../convex/aiProvider', () => ({ callAiProvider: vi.fn(), COUNCIL_MODELS: { planner: 'planner-test', wave1: 'wave1-test', wave2: 'wave2-test', critic: 'critic-test' } }))
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://nexus-forge.test', tokenIdentifier: 'https://nexus-forge.test|' + subject })
beforeEach(() => { vi.mocked(callAiProvider).mockReset(); vi.mocked(callAiProvider).mockResolvedValue('Controlled Council test response') })
afterEach(() => vi.restoreAllMocks())
async function fixture() {
  const t = convexTest(schema, modules), owner = t.withIdentity(identity('owner-a'))
  const missionId = await t.run(ctx => ctx.db.insert('missions', { title: 'Memory-aware plan', mission: 'Use reviewed evidence to plan a bounded product experiment', autonomy: 'guided', budget: 25, status: 'running', completion: 0, approved: true, ownerKey: 'owner-a' }))
  const ids = await t.run(async ctx => {
    const old = await ctx.db.insert('memories', { ownerKey: 'owner-a', category: 'learning-lesson', key: 'old-relevant', value: 'Older relevant lesson outside the current recent windows', confidence: 0.5, source: 'test' })
    for (let i = 0; i < 85; i++) await ctx.db.insert('memories', { ownerKey: 'owner-a', category: 'research-synthesis', key: 'noise-' + i, value: 'Unrelated recent record', confidence: 0.5, source: 'test' })
    const selected = await ctx.db.insert('memories', { ownerKey: 'owner-a', category: 'learning-lesson', key: 'reviewed-context', value: JSON.stringify({ reviewStatus: 'operator-reviewed', lesson: 'Use bounded validation before launch.', applicability: 'Product launch planning', strategyKey: 'strategy-one', evidenceReferences: ['receipt-one', 'receipt-two'] }), confidence: 0.6, source: 'operator-reviewed-manifest-learning' })
    const foreign = await ctx.db.insert('memories', { ownerKey: 'owner-b', category: 'learning-lesson', key: 'private-foreign', value: 'Foreign private context', confidence: 1, source: 'test' })
    return { old, selected, foreign }
  })
  return { t, owner, missionId, ...ids }
}
describe('actual Council memory selection provenance', () => {
  it('preserves existing learning/preflight selection and records multiple channels once', async () => {
    const { t, missionId, selected, old, foreign } = await fixture()
    const bundle = await t.query(internal.memory.getCouncilMemorySelection, { missionId })
    expect(bundle.learning).toEqual(await t.query(internal.memory.getLearningContext, { missionId }))
    expect(bundle.adaptive).toEqual(await t.query(internal.memory.getAdaptivePreflight, { missionId }))
    expect(bundle.selected.map(row => row.memoryId)).toContain(selected)
    expect(bundle.selected.map(row => row.memoryId)).not.toContain(old)
    expect(bundle.selected.map(row => row.memoryId)).not.toContain(foreign)
    expect(bundle.selected.find(row => row.memoryId === selected)?.routes).toEqual(['learning-lesson', 'adaptive-reuse'])
  })
  it('binds exact rendered text to the real planner call and confirms a returned planner response', async () => {
    const { t, owner, missionId, selected } = await fixture()
    await owner.action(api.forge.orchestrate, { missionId, mission: 'Client replacement must be ignored' })
    const rows = await owner.query(api.memory.councilMemoryHistory, { missionId })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'planner-responded', missionText: 'Use reviewed evidence to plan a bounded product experiment', policyVersion: 'council-recent-context-v1' })
    expect(rows[0].selected.map(row => row.memoryId)).toContain(selected)
    const plannerPrompt = vi.mocked(callAiProvider).mock.calls[0][1]
    expect(plannerPrompt).toContain(rows[0].learningContext)
    expect(plannerPrompt).toContain(rows[0].preflightContext)
    const snapshot = rows[0].learningContext
    await t.run(ctx => ctx.db.patch(selected, { value: 'Changed after planning' }))
    expect((await owner.query(api.memory.councilMemoryHistory, { missionId }))[0].learningContext).toBe(snapshot)
  })
  it('retains prepared status when the planner fails instead of claiming successful use', async () => {
    const { owner, missionId } = await fixture()
    vi.mocked(callAiProvider).mockRejectedValue(new Error('Provider unavailable in controlled test'))
    await expect(owner.action(api.forge.orchestrate, { missionId, mission: 'ignored' })).rejects.toThrow()
    expect((await owner.query(api.memory.councilMemoryHistory, { missionId }))[0].status).toBe('prepared')
  })
  it('scores selected and missed eligible memories and does not change captured context or approval', async () => {
    const { t, owner, missionId, selected, old } = await fixture()
    await owner.action(api.forge.orchestrate, { missionId, mission: 'ignored' })
    const receipt = (await owner.query(api.memory.councilMemoryHistory, { missionId }))[0]
    await owner.mutation(api.memory.evaluateCouncilMemory, { receiptId: receipt._id, expectedIds: [selected, old], rationale: 'Both memories contain relevant product planning guidance.' })
    const scores = await owner.query(api.memory.councilMemoryEvaluations, { receiptId: receipt._id })
    expect(scores[0]).toMatchObject({ hits: 1, selectedCount: 1, precision: 1, recall: 0.5 })
    expect((await owner.query(api.memory.councilMemoryHistory, { missionId }))[0]).toEqual(receipt)
    await t.run(async ctx => { expect((await ctx.db.get(missionId))?.approved).toBe(true) })
  })
  it('records zero relevance when the windows miss all expected eligible memories', async () => {
    const { t, owner, missionId, selected, old } = await fixture()
    await t.run(ctx => ctx.db.delete(selected))
    await owner.action(api.forge.orchestrate, { missionId, mission: 'ignored' })
    const receipt = (await owner.query(api.memory.councilMemoryHistory, { missionId }))[0]
    expect(receipt.selected).toEqual([])
    await owner.mutation(api.memory.evaluateCouncilMemory, { receiptId: receipt._id, expectedIds: [old], rationale: 'The older eligible planning lesson should have been considered.' })
    expect((await owner.query(api.memory.councilMemoryEvaluations, { receiptId: receipt._id }))[0]).toMatchObject({ hits: 0, selectedCount: 0, precision: 0, recall: 0 })
  })
  it('rejects anonymous/foreign history, invalid labels and memories created after the captured corpus', async () => {
    const { t, owner, missionId, selected, foreign } = await fixture()
    await owner.action(api.forge.orchestrate, { missionId, mission: 'ignored' })
    const receipt = (await owner.query(api.memory.councilMemoryHistory, { missionId }))[0]
    await expect(t.query(api.memory.councilMemoryHistory, { missionId })).rejects.toThrow()
    await expect(t.withIdentity(identity('owner-b')).query(api.memory.councilMemoryHistory, { missionId })).rejects.toThrow()
    const later = await owner.mutation(api.memory.remember, { category: 'learning-lesson', key: 'later', value: 'Lesson created after the captured corpus', confidence: 0.5, source: 'test' })
    for (const expectedIds of [[], [selected, selected], [foreign], [later]]) await expect(owner.mutation(api.memory.evaluateCouncilMemory, { receiptId: receipt._id, expectedIds, rationale: 'Relevant expected context' })).rejects.toThrow()
    await expect(t.withIdentity(identity('owner-b')).mutation(api.memory.evaluateCouncilMemory, { receiptId: receipt._id, expectedIds: [selected], rationale: 'Relevant expected context' })).rejects.toThrow()
  })
})

describe('captured advisory policy comparisons', () => {
  it('scores the same saved labels, preserves snapshots and deduplicates comparisons', async () => {
    const { t, owner, missionId } = await fixture()
    const target = await t.run(async ctx => {
      const id = await ctx.db.insert('memories', { ownerKey: 'owner-a', category: 'learning-lesson', key: 'bounded-product-experiment', value: 'Unique archived guidance: reviewed evidence bounded product experiment.', confidence: 0.6, source: 'test' })
      for (let i = 0; i < 20; i++) await ctx.db.insert('memories', { ownerKey: 'owner-a', category: 'learning-lesson', key: 'unrelated-' + i, value: 'Unrelated gardening information.', confidence: 0.5, source: 'test' })
      return id
    })
    await owner.action(api.forge.orchestrate, { missionId, mission: 'ignored' })
    const receipt = (await owner.query(api.memory.councilMemoryHistory, { missionId }))[0]
    expect(receipt.selected.map(row => row.memoryId)).not.toContain(target)
    expect(receipt.candidate?.selected.map(row => row.memoryId)).toContain(target)
    expect(receipt.candidate?.selected).toHaveLength(receipt.selected.length)
    expect(vi.mocked(callAiProvider).mock.calls[0][1]).not.toContain('Unique archived guidance')
    const evaluationId = await owner.mutation(api.memory.evaluateCouncilMemory, { receiptId: receipt._id, expectedIds: [target], rationale: 'The archived guidance matches the canonical mission.' })
    await t.run(ctx => ctx.db.patch(target, { value: 'Changed after capture' }))
    const id = await owner.mutation(api.memory.compareCouncilMemoryPolicy, { evaluationId })
    expect(await owner.mutation(api.memory.compareCouncilMemoryPolicy, { evaluationId })).toBe(id)
    const comparisons = await owner.query(api.memory.councilPolicyComparisons, { receiptId: receipt._id })
    expect(comparisons).toHaveLength(1)
    expect(comparisons[0].baseline).toMatchObject({ hits: 0, recall: 0 })
    expect(comparisons[0].candidate).toMatchObject({ hits: 1, recall: 1 })
    expect(comparisons[0].recallDelta).toBe(1)
    const omitted = receipt.selected.find(row => !receipt.candidate!.selected.some(item => item.memoryId === row.memoryId))!
    const regressionLabels = await owner.mutation(api.memory.evaluateCouncilMemory, { receiptId: receipt._id, expectedIds: [omitted.memoryId], rationale: 'This baseline memory remains relevant under another explicit judgment.' })
    await owner.mutation(api.memory.compareCouncilMemoryPolicy, { evaluationId: regressionLabels })
    const regression = (await owner.query(api.memory.councilPolicyComparisons, { receiptId: receipt._id })).find(row => row.evaluationId === regressionLabels)!
    expect(regression.recallDelta).toBe(-1)
    expect(regression.precisionDelta).toBeLessThan(0)
    expect((await owner.query(api.memory.councilMemoryHistory, { missionId }))[0]).toEqual(receipt)
    await expect(t.mutation(api.memory.compareCouncilMemoryPolicy, { evaluationId })).rejects.toThrow()
    await expect(t.withIdentity(identity('owner-b')).mutation(api.memory.compareCouncilMemoryPolicy, { evaluationId })).rejects.toThrow()
    await expect(t.withIdentity(identity('owner-b')).query(api.memory.councilPolicyComparisons, { receiptId: receipt._id })).rejects.toThrow()
  })
  it('does not reconstruct a candidate for historical receipts', async () => {
    const { t, owner, missionId, selected } = await fixture()
    await owner.action(api.forge.orchestrate, { missionId, mission: 'ignored' })
    const receipt = (await owner.query(api.memory.councilMemoryHistory, { missionId }))[0]
    await t.run(ctx => ctx.db.patch(receipt._id, { candidate: undefined }))
    const evaluationId = await owner.mutation(api.memory.evaluateCouncilMemory, { receiptId: receipt._id, expectedIds: [selected], rationale: 'Saved relevance label for historical context.' })
    await expect(owner.mutation(api.memory.compareCouncilMemoryPolicy, { evaluationId })).rejects.toThrow()
    expect(await owner.query(api.memory.councilPolicyComparisons, { receiptId: receipt._id })).toEqual([])
  })
})
