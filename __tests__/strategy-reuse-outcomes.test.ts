import { afterEach, describe, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://nexus-forge.test', tokenIdentifier: 'https://nexus-forge.test|' + subject })
afterEach(() => vi.useRealTimers())
async function fixture(candidateCost = 5) {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T12:00:00Z'))
  const t = convexTest(schema, modules), owner = t.withIdentity(identity('owner-a'))
  const create = (sourceMemoryId?: Id<'memories'>) => owner.mutation(api.missions.create, { title: 'Measured run', mission: 'Compare measured outcomes under equivalent conditions', autonomy: 'guided', budget: 25, ownerKey: 'ignored', ...(sourceMemoryId ? { sourceMemoryId } : {}) }) as Promise<Id<'missions'>>
  const baselineMissionId = await create()
  const baselineMeasurementId = await owner.mutation(api.verification.recordRuntimeCost, { missionId: baselineMissionId, actualCost: 7, evidence: 'Baseline usage ledger run 1' })
  vi.setSystemTime(new Date('2026-10-14T12:01:00Z'))
  const strategyId = await t.run(ctx => ctx.db.insert('memories', { ownerKey: 'owner-a', category: 'manifest-strategy', key: 'strategy-ledger-one', value: '{"name":"Bounded retries"}', confidence: 0.5, source: 'test' }))
  const lessonId = await owner.mutation(api.memory.remember, { category: 'learning-lesson', key: 'reviewed', value: 'Use bounded retries to reduce repeated work.', confidence: 0.6, source: 'operator-reviewed-manifest-learning', manifestStrategyId: strategyId, applicability: 'Equivalent tasks and provider conditions', evidenceReferences: ['Baseline run ledger', 'Measured retry report'] })
  const missionId = await create(lessonId)
  vi.setSystemTime(new Date('2026-10-14T12:02:00Z'))
  const candidateMeasurementId = await owner.mutation(api.verification.recordRuntimeCost, { missionId, actualCost: candidateCost, evidence: 'Candidate usage ledger run 2' })
  const args = { missionId, lessonId, baselineMeasurementId, candidateMeasurementId, applied: true, notes: 'Applied bounded retries under the same task and provider conditions.' }
  return { t, owner, args, create, strategyId, baselineMissionId }
}
describe('reviewed lesson reuse linked to measured outcomes', () => {
  it('retains lesson, strategy, handoff and measurement snapshots with lower-cost improvement', async () => {
    const { t, owner, args, strategyId } = await fixture()
    const id = await owner.mutation(api.learningEngine.recordReuseComparison, args)
    const rows = await owner.query(api.learningEngine.listReuseComparisons, {})
    expect(rows).toHaveLength(1); expect(rows[0]._id).toBe(id)
    const record = JSON.parse(rows[0].value)
    expect(record).toMatchObject({ version: 'strategy-reuse-v1', strategyId, lessonId: args.lessonId, missionId: args.missionId, delta: -2, outcome: 'improved', applied: true })
    expect(record.baseline.actual).toBe(7); expect(record.candidate.actual).toBe(5)
    expect(record.evidenceStatus).toContain('operator-recorded')
    expect(record.limitation).toContain('No causal proof')
    expect(await owner.mutation(api.learningEngine.recordReuseComparison, { ...args, notes: 'Attempting another note for the same measurement pair.' })).toBe(id)
    await t.run(async ctx => { expect((await ctx.db.get(args.missionId))?.approved).toBe(false); await ctx.db.patch(args.candidateMeasurementId, { actual: 99 }) })
    expect((await owner.query(api.learningEngine.listReuseComparisons, {}))[0].value).toBe(rows[0].value)
  })
  it.each([[10, 'regressed'], [7, 'unchanged']] as const)('records candidate cost %s as %s', async (cost, outcome) => {
    const { owner, args } = await fixture(cost)
    await owner.mutation(api.learningEngine.recordReuseComparison, args)
    expect(JSON.parse((await owner.query(api.learningEngine.listReuseComparisons, {}))[0].value).outcome).toBe(outcome)
  })
  it('rejects anonymous access and isolates private history', async () => {
    const { t, owner, args } = await fixture()
    await expect(t.mutation(api.learningEngine.recordReuseComparison, args)).rejects.toThrow()
    await expect(t.query(api.learningEngine.listReuseComparisons, {})).rejects.toThrow()
    await owner.mutation(api.learningEngine.recordReuseComparison, args)
    const other = t.withIdentity(identity('owner-b'))
    expect(await other.query(api.learningEngine.listReuseComparisons, {})).toEqual([])
    await expect(other.mutation(api.learningEngine.recordReuseComparison, args)).rejects.toThrow(/private workspace/)
  })
  it('requires a real lesson handoff and explicit application attestation', async () => {
    const { owner, args, create } = await fixture()
    const unlinked = await create()
    await expect(owner.mutation(api.learningEngine.recordReuseComparison, { ...args, missionId: unlinked })).rejects.toThrow(/not created/)
    await expect(owner.mutation(api.learningEngine.recordReuseComparison, { ...args, applied: false })).rejects.toThrow(/Confirm actual application/)
    await expect(owner.mutation(api.learningEngine.recordReuseComparison, { ...args, notes: 'short' })).rejects.toThrow()
    expect(await owner.query(api.learningEngine.listReuseComparisons, {})).toEqual([])
  })
  it('rejects mismatched metric/target and measurements outside temporal scope', async () => {
    const { t, owner, args } = await fixture()
    await t.run(ctx => ctx.db.patch(args.candidateMeasurementId, { target: 30 }))
    await expect(owner.mutation(api.learningEngine.recordReuseComparison, args)).rejects.toThrow(/same supported metric/)
    await t.run(ctx => ctx.db.patch(args.candidateMeasurementId, { target: 25, metric: 'business revenue' }))
    await expect(owner.mutation(api.learningEngine.recordReuseComparison, args)).rejects.toThrow(/same supported metric/)
    await expect(owner.mutation(api.learningEngine.recordReuseComparison, { ...args, baselineMeasurementId: args.candidateMeasurementId })).rejects.toThrow(/different baseline mission/)
  })
  it('rejects a later baseline and foreign baseline ownership', async () => {
    const { t, owner, args, baselineMissionId } = await fixture()
    const laterBaseline = await owner.mutation(api.verification.recordRuntimeCost, { missionId: baselineMissionId, actualCost: 6, evidence: 'Baseline recorded after handoff' })
    await expect(owner.mutation(api.learningEngine.recordReuseComparison, { ...args, baselineMeasurementId: laterBaseline })).rejects.toThrow(/Baseline must precede/)
    await t.run(ctx => ctx.db.patch(baselineMissionId, { ownerKey: 'owner-b' }))
    await expect(owner.mutation(api.learningEngine.recordReuseComparison, args)).rejects.toThrow(/Baseline mission not found/)
  })
  it('blocks generic writes from fabricating mission-source or reuse receipts', async () => {
    const { owner } = await fixture()
    for (const category of ['mission-source', 'strategy-reuse-comparison']) await expect(owner.mutation(api.memory.remember, { category, key: 'forged', value: '{}', confidence: 1, source: 'mission-source-link' })).rejects.toThrow(/computed by the server/)
  })
})
