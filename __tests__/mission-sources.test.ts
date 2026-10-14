import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://test', tokenIdentifier: 'https://test|' + subject })

describe('mission intelligence source receipts', () => {
  it.each([['manifest-blueprint', '/manifest'], ['intent-specification', '/orchestrator']])('links an owned %s to a new draft', async (category, path) => {
    const t = convexTest(schema, modules)
    const sourceMemoryId = await t.run(ctx => ctx.db.insert('memories', { ownerKey: 'owner-a', category, key: 'saved-receipt', value: 'Proposal', confidence: 0.7, source: 'test' }))
    const operator = t.withIdentity(identity('owner-a'))
    const id = await operator.mutation(api.missions.create, { title: 'Linked draft', mission: 'Review this source proposal', autonomy: 'Approval required', budget: 0, ownerKey: 'ignored', sourceMemoryId }) as Id<'missions'>
    expect(await operator.query(api.missionSources.list, { missionId: id })).toEqual([{ sourceMemoryId, path, key: 'saved-receipt' }])
    expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ approved: false, status: 'draft' })
    await expect(t.withIdentity(identity('owner-b')).query(api.missionSources.list, { missionId: id })).rejects.toThrow(/access denied|not found/i)
  })

  it.each([true, false])('accepts learning sources only when reviewed: %s', async reviewed => {
    const t = convexTest(schema, modules)
    const sourceMemoryId = await t.run(ctx => ctx.db.insert('memories', { ownerKey: 'owner-a', category: 'learning-lesson', key: 'lesson', value: JSON.stringify({ lesson: 'Compare equivalent measurements', applicability: 'Comparable runs', evidenceReferences: ['run-one', 'run-two'], reviewStatus: reviewed ? 'operator-reviewed' : 'unreviewed' }), confidence: 0.6, source: 'operator-reviewed-manifest-learning' }))
    const operator = t.withIdentity(identity('owner-a'))
    const create = () => operator.mutation(api.missions.create, { title: 'Lesson mission', mission: 'Evaluate this lesson on a new run', autonomy: 'Approval required', budget: 0, ownerKey: 'ignored', sourceMemoryId })
    if (!reviewed) {
      await expect(create()).rejects.toThrow(/access denied|not found/i)
      expect(await t.run(ctx => ctx.db.query('missions').collect())).toHaveLength(0)
    } else {
      const missionId = await create() as Id<'missions'>
      expect(await operator.query(api.missionSources.list, { missionId })).toEqual([{ sourceMemoryId, path: '/learning', key: 'lesson' }])
    }
  })

  it('rejects a foreign receipt without creating a mission', async () => {
    const t = convexTest(schema, modules)
    const sourceMemoryId = await t.run(ctx => ctx.db.insert('memories', { ownerKey: 'owner-b', category: 'manifest-blueprint', key: 'private', value: 'Private', confidence: 0.7, source: 'test' }))
    await expect(t.withIdentity(identity('owner-a')).mutation(api.missions.create, { title: 'Invalid link', mission: 'Must not use foreign receipt', autonomy: 'Approval required', budget: 0, ownerKey: 'owner-a', sourceMemoryId })).rejects.toThrow(/access denied|not found/i)
    expect(await t.run(ctx => ctx.db.query('missions').collect())).toHaveLength(0)
  })
})
