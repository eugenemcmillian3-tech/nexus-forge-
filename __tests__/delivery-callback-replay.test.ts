import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { internal } from '../convex/_generated/api'
const modules = import.meta.glob('../convex/**/*.ts')
const runUrl = 'https://github.com/nexus-forge1/no-dispatch/actions/runs/123'
const commitSha = 'a'.repeat(40)

describe('delivery callback replay', () => {
  it('preserves verified state on identical callbacks and rejects conflicting receipts', async () => {
    const t = convexTest(schema, modules)
    const id = await t.run(async ctx => {
      const missionId = await ctx.db.insert('missions', { title: 'Replay test', mission: 'Verify callback lifecycle', ownerKey: 'owner', autonomy: 'guided', budget: 0, approved: true, status: 'running', completion: 0 })
      return ctx.db.insert('deliveries', { missionId, target: 'nexus-forge1/no-dispatch', branch: 'main', stage: 'github', approved: true, status: 'GitHub Actions dispatched', evidence: 'Dispatched', createdAt: 1 })
    })
    const workflow = { id, runUrl, commitSha, conclusion: 'success', summary: 'Build passed' }
    const deployment = { id, runUrl, commitSha, readinessPassedCount: 6, readinessTotalCount: 6, deploymentUrl: 'https://example.com/', summary: 'Readiness: 6/6 checks passed' }
    await expect(t.mutation(internal.delivery.recordDeploymentResult, deployment)).rejects.toThrow(/successful workflow|match|build.test/i)
    await t.mutation(internal.delivery.recordWorkflowResult, workflow)
    await t.mutation(internal.delivery.recordDeploymentResult, deployment)
    const before = await t.run(ctx => ctx.db.get(id))
    const auditsBefore = await t.run(ctx => ctx.db.query('auditEvents').collect())
    await t.mutation(internal.delivery.recordWorkflowResult, workflow)
    await t.mutation(internal.delivery.recordDeploymentResult, deployment)
    expect(await t.run(ctx => ctx.db.get(id))).toEqual(before)
    expect(await t.run(ctx => ctx.db.query('auditEvents').collect())).toHaveLength(auditsBefore.length)
    await expect(t.mutation(internal.delivery.recordWorkflowResult, { ...workflow, conclusion: 'failure' })).rejects.toThrow(/conflicting/i)
    await expect(t.mutation(internal.delivery.recordWorkflowResult, { ...workflow, commitSha: 'b'.repeat(40) })).rejects.toThrow(/conflicting/i)
    await expect(t.mutation(internal.delivery.recordDeploymentResult, { ...deployment, deploymentUrl: 'https://different.example/' })).rejects.toThrow(/conflicting/i)
    expect(await t.run(ctx => ctx.db.get(id))).toEqual(before)
  })
})
