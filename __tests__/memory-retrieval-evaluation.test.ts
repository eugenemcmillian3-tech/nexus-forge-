import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://nexus-forge.test', tokenIdentifier: 'https://nexus-forge.test|' + subject })
async function fixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async ctx => {
    const mission = (ownerKey: string) => ctx.db.insert('missions', { ownerKey, title: 'Retrieval', mission: 'Measure relevant lessons', autonomy: 'guided', budget: 0, status: 'draft', completion: 0, approved: false })
    const first = await mission('owner-a'), second = await mission('owner-a'), foreignMission = await mission('owner-b')
    const lesson = (ownerKey: string, value: string, missionId = first, category = 'learning-lesson') => ctx.db.insert('memories', { ownerKey, value, missionId, category, key: value.slice(0, 40), confidence: 0.5, source: 'verified-measurement' })
    const target = await lesson('owner-a', 'Orchard evidence: compare measured harvest outcomes.')
    for (let i = 0; i < 7; i++) await lesson('owner-a', 'Unrelated lesson number ' + i)
    const otherScope = await lesson('owner-a', 'Orchard secondary lesson', second)
    const foreign = await lesson('owner-b', 'Orchard private lesson', foreignMission)
    const wrongCategory = await lesson('owner-a', 'Orchard research summary', first, 'research-synthesis')
    return { first, second, foreignMission, target, otherScope, foreign, wrongCategory }
  })
  const owner = t.withIdentity(identity('owner-a'))
  const args = { search: 'Orchard', expectedIds: [ids.target], missionId: ids.first, rationale: 'Harvest outcomes answer the question.' }
  return { t, owner, args, ...ids }
}
describe('server-observed private lesson retrieval evaluation', () => {
  it('finds an older relevant lesson missed by newest-five baseline and persists observed scores', async () => {
    const { owner, args, target } = await fixture()
    const id = await owner.action(api.memory.evaluateRetrieval, args)
    const rows = await owner.query(api.memory.retrievalEvaluations, {})
    expect(rows).toHaveLength(1)
    expect(rows[0]._id).toBe(id)
    const receipt = JSON.parse(rows[0].value)
    expect(receipt.baseline).toMatchObject({ returned: 5, hits: 0, precisionAt5: 0, recallAt5: 0, reciprocalRank: 0 })
    expect(receipt.candidate).toMatchObject({ returned: 1, hits: 1, precisionAt5: 0.2, recallAt5: 1, reciprocalRank: 1 })
    expect(receipt.candidate.results.map((row: { id: string }) => row.id)).toEqual([target])
    expect(receipt.labels).toContain('operator-selected')
  })
  it('records zero results as zero effectiveness without creating a pass', async () => {
    const { owner, args } = await fixture()
    await owner.action(api.memory.evaluateRetrieval, { ...args, search: 'NoMatchingVocabulary' })
    const receipt = JSON.parse((await owner.query(api.memory.retrievalEvaluations, {}))[0].value)
    expect(receipt.candidate).toMatchObject({ returned: 0, hits: 0, precisionAt5: 0, recallAt5: 0, reciprocalRank: 0 })
  })
  it('rejects anonymous reads and writes and keeps history private', async () => {
    const { t, owner, args } = await fixture()
    await expect(t.action(api.memory.evaluateRetrieval, args)).rejects.toThrow()
    await expect(t.query(api.memory.retrievalEvaluations, {})).rejects.toThrow()
    await owner.action(api.memory.evaluateRetrieval, args)
    expect(await t.withIdentity(identity('owner-b')).query(api.memory.retrievalEvaluations, {})).toEqual([])
  })
  it('rejects foreign, wrong-category, and out-of-scope labels without saving', async () => {
    const { owner, args, foreign, foreignMission, wrongCategory, otherScope } = await fixture()
    for (const id of [foreign, wrongCategory, otherScope]) await expect(owner.action(api.memory.evaluateRetrieval, { ...args, expectedIds: [id] })).rejects.toThrow(/selected private scope/)
    await expect(owner.action(api.memory.evaluateRetrieval, { ...args, missionId: foreignMission })).rejects.toThrow()
    expect(await owner.query(api.memory.retrievalEvaluations, {})).toEqual([])
  })
  it('does not accept client-authored evaluation receipts through generic memory writes', async () => {
    const { owner } = await fixture()
    await expect(owner.mutation(api.memory.remember, { category: 'retrieval-evaluation', key: 'forged', value: '{"candidate":{"precisionAt5":1}}', confidence: 1, source: 'server-observed-retrieval-operator-labels' })).rejects.toThrow(/computed by the server/)
    expect(await owner.query(api.memory.retrievalEvaluations, {})).toEqual([])
  })
  it('bounds labels and question and rejects duplicate labels', async () => {
    const { owner, args } = await fixture()
    for (const patch of [{ expectedIds: [] }, { expectedIds: [args.expectedIds[0], args.expectedIds[0]] }, { search: '' }, { search: 'x'.repeat(201) }, { rationale: 'short' }]) await expect(owner.action(api.memory.evaluateRetrieval, { ...args, ...patch })).rejects.toThrow()
  })
  it('retains snapshots after a lesson changes and never modifies mission approval', async () => {
    const { t, owner, args, target, first } = await fixture()
    await owner.action(api.memory.evaluateRetrieval, args)
    const before = (await owner.query(api.memory.retrievalEvaluations, {}))[0].value
    await t.run(async ctx => { await ctx.db.patch(target, { value: 'Updated lesson content' }); expect((await ctx.db.get(first))?.approved).toBe(false) })
    expect((await owner.query(api.memory.retrievalEvaluations, {}))[0].value).toBe(before)
  })
})
