import { afterEach, describe, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://nexus-forge.test', tokenIdentifier: 'https://nexus-forge.test|' + subject })
const epoch = Date.parse('2026-10-14T10:00:00Z'), hour = 3600000
afterEach(() => vi.useRealTimers())
async function fixture(observed = 8, metric: 'task-success-rate' | 'task-time-seconds' = 'task-success-rate') {
  vi.useFakeTimers(); vi.setSystemTime(epoch)
  const t = convexTest(schema, modules), owner = t.withIdentity(identity('owner-a'))
  const create = (lessonId?: Id<'memories'>) => owner.mutation(api.missions.create, { title: 'Product comparison', mission: 'Compare equivalent product trials with observed evidence', autonomy: 'guided', budget: 25, ownerKey: 'ignored', ...(lessonId ? { sourceMemoryId: lessonId } : {}) }) as Promise<Id<'missions'>>
  const baselineMissionId = await create()
  const observation = { metric, observed: 4, target: 75, sampleSize: 10, periodStart: epoch - 3 * hour, periodEnd: epoch - 2 * hour, method: 'Count completed tasks from equivalent fixed-size trial exports.', evidence: ['Trial export receipt 123'], notes: 'Controlled trial scope.' }
  const baselineOutcomeId = await owner.mutation(api.verification.recordProductOutcome, { ...observation, missionId: baselineMissionId })
  vi.setSystemTime(epoch + hour)
  const strategyId = await t.run(ctx => ctx.db.insert('memories', { ownerKey: 'owner-a', category: 'manifest-strategy', key: 'trial-strategy', value: '{"name":"Improve task guidance"}', confidence: 0.5, source: 'test' }))
  const lessonId = await owner.mutation(api.memory.remember, { category: 'learning-lesson', key: 'reviewed', value: 'Use clear task guidance in subsequent product trials.', confidence: 0.6, source: 'operator-reviewed-manifest-learning', manifestStrategyId: strategyId, applicability: 'Equivalent trial populations and conditions', evidenceReferences: ['First trial export', 'Reviewed trial report'] })
  const missionId = await create(lessonId)
  vi.setSystemTime(epoch + 4 * hour)
  const candidateOutcomeId = await owner.mutation(api.verification.recordProductOutcome, { ...observation, observed, missionId, periodStart: epoch + 2 * hour, periodEnd: epoch + 3 * hour })
  const args = { missionId, lessonId, baselineOutcomeId, candidateOutcomeId, applied: true, notes: 'Applied clearer guidance with equivalent trial participants and conditions.' }
  return { t, owner, args, strategyId, baselineMissionId, create }
}
describe('product observations linked to actual lesson reuse', () => {
  it('recomputes rates and persists immutable idempotent provenance and observation snapshots', async () => {
    const { t, owner, args, strategyId } = await fixture()
    const id = await owner.mutation(api.learningEngine.recordProductReuseComparison, args)
    const rows = await owner.query(api.learningEngine.listReuseComparisons, {})
    const record = JSON.parse(rows[0].value)
    expect(record).toMatchObject({ version: 'strategy-reuse-product-v1', strategyId, lessonId: args.lessonId, outcome: 'improved', delta: 40 })
    expect(record.baseline).toMatchObject({ actual: 40, sampleSize: 10, provenance: 'operator-recorded' })
    expect(record.candidate).toMatchObject({ actual: 80, observed: 8, sampleSize: 10 })
    expect(record.evidenceStatus).toContain('operator-recorded')
    expect(await owner.mutation(api.learningEngine.recordProductReuseComparison, args)).toBe(id)
    expect(await owner.query(api.learningEngine.listReuseComparisons, {})).toHaveLength(1)
    await t.run(async ctx => { await ctx.db.patch(args.candidateOutcomeId, { observed: 1, actual: 10 }); expect(await ctx.db.get(args.missionId)).toMatchObject({ approved: false, status: 'draft', completion: 0 }) })
    expect((await owner.query(api.learningEngine.listReuseComparisons, {}))[0].value).toBe(rows[0].value)
  })
  it.each([[2, 'regressed'], [4, 'unchanged']] as const)('retains task success count %s as %s', async (count, outcome) => {
    const { owner, args } = await fixture(count)
    await owner.mutation(api.learningEngine.recordProductReuseComparison, args)
    expect(JSON.parse((await owner.query(api.learningEngine.listReuseComparisons, {}))[0].value).outcome).toBe(outcome)
  })
  it('applies lower-is-better to task time', async () => {
    const { owner, args } = await fixture(2, 'task-time-seconds')
    await owner.mutation(api.learningEngine.recordProductReuseComparison, args)
    expect(JSON.parse((await owner.query(api.learningEngine.listReuseComparisons, {}))[0].value)).toMatchObject({ direction: 'lower', delta: -2, outcome: 'improved' })
  })
  it('rejects different targets, samples, methods and observation durations', async () => {
    const { t, owner, args } = await fixture()
    const original = await t.run(ctx => ctx.db.get('productOutcomes', args.candidateOutcomeId))
    for (const patch of [{ target: 90 }, { sampleSize: 11 }, { method: 'Different collection method' }, { periodEnd: epoch + 3.5 * hour }]) {
      await t.run(ctx => ctx.db.patch(args.candidateOutcomeId, patch))
      await expect(owner.mutation(api.learningEngine.recordProductReuseComparison, args)).rejects.toThrow(/same|equal/)
      await t.run(ctx => ctx.db.patch(args.candidateOutcomeId, { target: original!.target, sampleSize: original!.sampleSize, method: original!.method, periodEnd: original!.periodEnd }))
    }
  })
  it('rejects a candidate period predating handoff, even when recorded afterward', async () => {
    const { t, owner, args } = await fixture()
    await t.run(ctx => ctx.db.patch(args.candidateOutcomeId, { periodStart: epoch - hour, periodEnd: epoch }))
    await expect(owner.mutation(api.learningEngine.recordProductReuseComparison, args)).rejects.toThrow(/handoff/)
  })
  it('requires a real handoff, explicit application and owned observations', async () => {
    const { t, owner, args, create } = await fixture()
    await expect(t.mutation(api.learningEngine.recordProductReuseComparison, args)).rejects.toThrow()
    const unlinked = await create()
    await expect(owner.mutation(api.learningEngine.recordProductReuseComparison, { ...args, missionId: unlinked })).rejects.toThrow(/not created/)
    await expect(owner.mutation(api.learningEngine.recordProductReuseComparison, { ...args, applied: false })).rejects.toThrow(/Confirm application/)
    await t.run(ctx => ctx.db.patch(args.baselineOutcomeId, { ownerKey: 'owner-b' }))
    await expect(owner.mutation(api.learningEngine.recordProductReuseComparison, args)).rejects.toThrow(/owned product observations/)
    expect(await owner.query(api.learningEngine.listReuseComparisons, {})).toEqual([])
  })
})
