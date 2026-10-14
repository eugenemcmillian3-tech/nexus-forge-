import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
import { evaluateProductOutcome } from '../convex/productOutcomeModel'
import type { Id } from '../convex/_generated/dataModel'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://nexus-forge.test', tokenIdentifier: 'https://nexus-forge.test|' + subject })
async function fixture() {
  const t = convexTest(schema, modules), owner = t.withIdentity(identity('owner-a'))
  const create = (user: typeof owner) => user.mutation(api.missions.create, { title: 'Product pilot', mission: 'Measure actual product adoption during a completed pilot', autonomy: 'guided', budget: 25, ownerKey: 'ignored' }) as Promise<Id<'missions'>>
  const missionId = await create(owner), otherMissionId = await create(t.withIdentity(identity('owner-b')))
  const args = { missionId, metric: 'task-success-rate' as const, observed: 8, sampleSize: 10, target: 75, periodStart: Date.now() - 7200000, periodEnd: Date.now() - 3600000, method: 'Count completed tasks from the exported experiment ledger.', evidence: ['Experiment export receipt 123'], notes: 'Small pilot sample; operator-entered evidence.' }
  return { t, owner, args, otherMissionId }
}
const paginationOpts = { numItems: 10, cursor: null }
describe('private product and business outcome observations', () => {
  it('derives rate and target comparison from counts and retains operator provenance without completing the mission', async () => {
    const { t, owner, args } = await fixture()
    const id = await owner.mutation(api.verification.recordProductOutcome, args)
    const result = await owner.query(api.verification.productOutcomes, { missionId: args.missionId, paginationOpts })
    expect(result.page[0]).toMatchObject({ _id: id, actual: 80, observed: 8, sampleSize: 10, target: 75, targetMet: true, unit: '%', provenance: 'operator-recorded', ownerKey: 'owner-a' })
    await t.run(async ctx => { expect(await ctx.db.get(args.missionId)).toMatchObject({ status: 'draft', completion: 0, approved: false }); expect(await ctx.db.query('measurements').collect()).toEqual([]) })
  })
  it('keeps an unmet target visible and applies lower-is-better for task time', async () => {
    const { owner, args } = await fixture()
    await owner.mutation(api.verification.recordProductOutcome, { ...args, metric: 'task-time-seconds', observed: 40, target: 30 })
    const result = await owner.query(api.verification.productOutcomes, { paginationOpts })
    expect(result.page[0]).toMatchObject({ actual: 40, targetMet: false, unit: 'seconds', direction: 'lower' })
  })
  it('rejects anonymous writes/reads, foreign mission access, and isolates all-mission history', async () => {
    const { t, owner, args, otherMissionId } = await fixture()
    await expect(t.mutation(api.verification.recordProductOutcome, args)).rejects.toThrow()
    await expect(t.query(api.verification.productOutcomes, { paginationOpts })).rejects.toThrow()
    await expect(owner.mutation(api.verification.recordProductOutcome, { ...args, missionId: otherMissionId })).rejects.toThrow()
    await expect(owner.query(api.verification.productOutcomes, { missionId: otherMissionId, paginationOpts })).rejects.toThrow()
    await owner.mutation(api.verification.recordProductOutcome, args)
    expect((await t.withIdentity(identity('owner-b')).query(api.verification.productOutcomes, { paginationOpts })).page).toEqual([])
  })
  it('paginates evidence history without a fixed first-batch cutoff', async () => {
    const { owner, args } = await fixture()
    for (let i = 0; i < 3; i++) await owner.mutation(api.verification.recordProductOutcome, { ...args, observed: i })
    const first = await owner.query(api.verification.productOutcomes, { paginationOpts: { numItems: 2, cursor: null } })
    expect(first.page).toHaveLength(2); expect(first.isDone).toBe(false)
    const second = await owner.query(api.verification.productOutcomes, { paginationOpts: { numItems: 2, cursor: first.continueCursor } })
    expect(new Set([...first.page, ...second.page].map(row => row._id)).size).toBe(3)
  })
  it('rejects invalid windows, impossible samples, duplicate evidence and missing method', async () => {
    const { owner, args } = await fixture()
    for (const patch of [{ periodEnd: Date.now() + 3600000 }, { periodEnd: args.periodStart }, { observed: 11 }, { sampleSize: 0 }, { sampleSize: 1.5 }, { target: 101 }, { evidence: [] }, { evidence: ['same-reference', 'same-reference'] }, { method: 'short' }]) await expect(owner.mutation(api.verification.recordProductOutcome, { ...args, ...patch })).rejects.toThrow()
    expect((await owner.query(api.verification.productOutcomes, { paginationOpts })).page).toEqual([])
  })
  it('enforces integral population counts and finite values', () => {
    const input = { metric: 'active-users', observed: 3, target: 2, sampleSize: 10, periodStart: 1, periodEnd: 2, method: 'Count unique consenting pilot users.', evidence: ['Report receipt 123'], notes: '' }
    expect(evaluateProductOutcome(input, 3)).toMatchObject({ actual: 3, targetMet: true, unit: 'people' })
    for (const patch of [{ observed: 1.5 }, { target: 1.5 }, { observed: 11 }, { observed: NaN }, { target: Infinity }]) expect(() => evaluateProductOutcome({ ...input, ...patch }, 3)).toThrow()
    expect(evaluateProductOutcome({ ...input, metric: 'revenue-usd', observed: 12.5 }, 3)).toMatchObject({ actual: 12.5, unit: 'USD' })
  })
})
