import { beforeEach, describe, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
import { verifyArtifactContent } from '../convex/artifactQuality'

vi.mock('../convex/artifactQuality', () => ({ verifyArtifactContent: vi.fn() }))
const modules = import.meta.glob('../convex/**/*.ts')
beforeEach(() => vi.mocked(verifyArtifactContent).mockReturnValue({ passed: true, score: 1, checks: ['Passed'] }))
const identity = { subject: 'owner-a', issuer: 'https://test', tokenIdentifier: 'https://test|owner-a' }

async function setup(status = 'ready') {
  const t = convexTest(schema, modules)
  const ids = await t.run(async ctx => {
    const missionId = await ctx.db.insert('missions', { title: 'Lifecycle', mission: 'Check lifecycle', ownerKey: 'owner-a', autonomy: 'guided', approved: true, budget: 0, status: 'running', completion: 0 })
    const artifactId = await ctx.db.insert('artifacts', { missionId, type: 'web-app', name: 'Approved implementation', content: '<html>test</html>', status, requiresApproval: false })
    return { missionId, artifactId }
  })
  return { t, operator: t.withIdentity(identity), ...ids }
}

describe('artifact and delivery lifecycle', () => {
  it('keeps an approved artifact ready after successful re-verification', async () => {
    const { t, operator, artifactId } = await setup()
    await operator.mutation(api.artifacts.verify, { id: artifactId })
    expect(await t.run(ctx => ctx.db.get(artifactId))).toMatchObject({ status: 'ready', requiresApproval: false })
  })

  it('blocks delivery when re-verification fails and cannot revive a rejected artifact', async () => {
    const { t, operator, artifactId, missionId } = await setup()
    vi.mocked(verifyArtifactContent).mockReturnValue({ passed: false, score: 0, checks: ['Failed'] })
    await operator.mutation(api.artifacts.verify, { id: artifactId })
    await expect(operator.mutation(api.delivery.prepare, { missionId, artifactId, target: 'nexus-forge1/no-dispatch', branch: 'main' })).rejects.toThrow(/approval is required/i)
    await t.run(ctx => ctx.db.patch(artifactId, { status: 'rejected' }))
    await expect(operator.mutation(api.artifacts.verify, { id: artifactId })).rejects.toThrow(/regenerated/i)
    expect(await t.run(ctx => ctx.db.get(artifactId))).toMatchObject({ status: 'rejected' })
  })

  it.each(['github', 'test', 'verified'] as const)('does not rewind a delivery with execution evidence at %s', async stage => {
    const { t, operator, artifactId, missionId } = await setup()
    const id = await t.run(ctx => ctx.db.insert('deliveries', { missionId, artifactId, target: 'nexus-forge1/no-dispatch', branch: 'main', stage, approved: true, status: 'Execution recorded', evidence: 'GitHub Actions workflow dispatched', createdAt: 1 }))
    await expect(operator.mutation(api.delivery.approve, { id, approved: true })).rejects.toThrow(/cannot change/i)
    expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ stage, approved: true })
  })
})
