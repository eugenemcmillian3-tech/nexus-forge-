// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://review.test', tokenIdentifier: 'https://review.test|'+subject })
async function fixture() {
  const t = convexTest(schema, modules), owner = t.withIdentity(identity('review-owner'))
  const missionId = await t.run(c => c.db.insert('missions', { title: 'Review', mission: 'Review a bounded run', autonomy: 'guided', budget: 0, status: 'running', completion: 0, approved: true, ownerKey: 'review-owner' }))
  const runId = await t.run(c => c.db.insert('missionRuns', { missionId, status: 'running', startedAt: 1, deadlineAt: 100, maxRetries: 1, retries: 0, currentStage: 'council', nextActionAt: 1 }))
  const claim = await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'runner:'+runId })
  return { t, owner, missionId, runId, claimId: claim.claimId! }
}
describe('reviewed execution decisions', () => {
  it('denies anonymous and foreign evidence access and review writes', async () => {
    const { t, claimId } = await fixture()
    const foreign = t.withIdentity(identity('other-owner'))
    await expect(t.query(api.executionReview.evidence, { claimId })).rejects.toThrow(/Authenticated/)
    await expect(foreign.query(api.executionReview.evidence, { claimId })).rejects.toThrow(/access denied/)
    await expect(foreign.mutation(api.executionReview.record, { claimId, evidenceToken: '', decision: 'hold', note: 'Investigate the missing provider result.' })).rejects.toThrow(/access denied/)
  })
  it('records an idempotent audited decision without changing claim or provider state', async () => {
    const { t, owner, missionId, runId, claimId } = await fixture()
    await t.mutation(internal.executionClaims.uncertain, { claimId })
    const before = await owner.query(api.executionReview.evidence, { claimId })
    const args = { claimId, evidenceToken: before.evidenceToken, decision: 'escalate' as const, note: 'No durable answer is confirmed; investigate host execution.' }
    await owner.mutation(api.executionReview.record, args)
    await owner.mutation(api.executionReview.record, args)
    expect((await owner.query(api.executionReview.evidence, { claimId })).lastReview?.decision).toBe('escalate')
    expect(await t.run(c => c.db.query('auditEvents').collect())).toHaveLength(1)
    expect(await t.run(c => c.db.query('providerInvocations').collect())).toEqual([])
    expect((await t.mutation(internal.executionClaims.acquire, { missionId, scope: 'council', workKey: 'runner:'+runId })).busy).toBe('uncertain')
  })
  it('rejects active work and stale evidence', async () => {
    const { t, owner, missionId, runId, claimId } = await fixture()
    const initial = await owner.query(api.executionReview.evidence, { claimId })
    const args = { claimId, evidenceToken: initial.evidenceToken, decision: 'hold' as const, note: 'Review all provider evidence before retrying.' }
    await expect(owner.mutation(api.executionReview.record, args)).rejects.toThrow(/Only uncertain/)
    await t.mutation(internal.executionClaims.uncertain, { claimId })
    const current = await owner.query(api.executionReview.evidence, { claimId })
    await t.run(c => c.db.insert('providerInvocations', { missionId, missionRunId: runId, ownerKey: 'review-owner', stage: 'council-plan', role: 'planner', startedAt: 1, outcome: 'pending', usageStatus: 'pending', reports: [] }))
    await expect(owner.mutation(api.executionReview.record, { ...args, evidenceToken: current.evidenceToken })).rejects.toThrow(/evidence changed/)
    expect(await t.run(c => c.db.query('auditEvents').collect())).toEqual([])
  })
  it('shows bounded provider evidence and never returns provider answers', async () => {
    const { t, owner, missionId, runId, claimId } = await fixture()
    await t.run(async c => {
      for (let i=0; i<11; i++) {
        const invocationId = await c.db.insert('providerInvocations', { missionId, missionRunId: runId, ownerKey: 'review-owner', stage: 'council-'+i, role: 'planner', startedAt: i, outcome: 'succeeded', usageStatus: 'missing', reports: [] })
        await c.db.insert('providerResults', { invocationId, requestDigest: 'a'.repeat(64), answer: 'PRIVATE_PROVIDER_ANSWER' })
      }
    })
    const evidence = await owner.query(api.executionReview.evidence, { claimId })
    expect(evidence.invocations).toHaveLength(10)
    expect(evidence.invocationsTruncated).toBe(true)
    expect(evidence.invocations.every(row => row.recoverable)).toBe(true)
    expect(JSON.stringify(evidence)).not.toContain('PRIVATE_PROVIDER_ANSWER')
    expect(evidence.context).toBeNull()
  })
})
