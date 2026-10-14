import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://test', tokenIdentifier: 'https://test|' + subject })
describe('orchestration resource ownership', () => {
  it.each(['acquireForExecution', 'releaseForMission'] as const)('rejects foreign mission resource mutation through %s', async name => {
    const t = convexTest(schema, modules)
    const missionId = await t.run(async ctx => {
      const id = await ctx.db.insert('missions', { title: 'Owned resource', mission: 'Check resource isolation', ownerKey: 'owner-a', autonomy: 'guided', budget: 0, status: 'running', approved: true, completion: 0 })
      await ctx.db.insert('missionResources', { missionId: id, resourceKey: 'test-resource', mode: 'exclusive', status: 'held', heldAt: 1 })
      return id
    })
    await expect(t.withIdentity(identity('owner-b')).mutation(api.orchestration[name], { missionId })).rejects.toThrow(/access denied|not found/i)
    expect(await t.run(ctx => ctx.db.query('missionResources').collect())).toMatchObject([{ status: 'held', heldAt: 1 }])
    expect(await t.withIdentity(identity('owner-a')).mutation(api.orchestration.releaseForMission, { missionId })).toBe(1)
  })
})
