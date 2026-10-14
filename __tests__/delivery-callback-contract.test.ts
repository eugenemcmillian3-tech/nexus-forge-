import { afterEach, describe, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { internal } from '../convex/_generated/api'
const modules = import.meta.glob('../convex/**/*.ts')
afterEach(() => vi.unstubAllEnvs())
describe('delivery callback contract', () => {
  it('uses explicit readiness counts instead of summary prose', async () => {
    const t = convexTest(schema, modules)
    const runUrl = 'https://github.com/nexus-forge1/no-dispatch/actions/runs/123'
    const commitSha = 'a'.repeat(40)
    const id = await t.run(async ctx => {
      const missionId = await ctx.db.insert('missions', { title: 'Count contract', mission: 'Check readiness counts', ownerKey: 'owner', autonomy: 'guided', budget: 0, status: 'running', approved: true, completion: 0 })
      return ctx.db.insert('deliveries', { missionId, target: 'nexus-forge1/no-dispatch', branch: 'main', stage: 'test', approved: true, status: 'Test passed', evidence: 'Build evidence', workflowRunUrl: runUrl, workflowCommitSha: commitSha, workflowConclusion: 'success', createdAt: 1 })
    })
    const args = { id, runUrl, commitSha, deploymentUrl: 'https://example.com/', summary: 'Readiness: 999/999 from caller text', readinessPassedCount: 6, readinessTotalCount: 6 }
    await expect(t.mutation(internal.delivery.recordDeploymentResult, { ...args, readinessPassedCount: 1.5, readinessTotalCount: 1.5 })).rejects.toThrow(/readiness/i)
    await expect(t.mutation(internal.delivery.recordDeploymentResult, { ...args, readinessPassedCount: 0, readinessTotalCount: 0 })).rejects.toThrow(/readiness/i)
    await t.mutation(internal.delivery.recordDeploymentResult, args)
    expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ readinessPassedCount: 6, readinessTotalCount: 6, stage: 'verified' })
  })
  it.each([null, {}, { deliveryId: 'x', conclusion: 'success', runUrl: 'https://github.com/a/b/actions/runs/1', commitSha: 'a'.repeat(40), summary: 42 }])('rejects malformed authenticated workflow payloads without mutation', async body => {
    vi.stubEnv('NEXUS_FORGE_DELIVERY_SECRET', 'test-callback-secret')
    const t = convexTest(schema, modules)
    const response = await t.fetch('/github-actions/delivery-result', { method: 'POST', headers: { Authorization: 'Bearer test-callback-secret', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    expect(response.status).toBe(400)
    expect(await t.run(ctx => ctx.db.query('auditEvents').collect())).toHaveLength(0)
  })
})
