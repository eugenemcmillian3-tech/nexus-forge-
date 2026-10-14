import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
import { extractAcceptanceCriteria, summarizeBrowserRun, validateBrowserPlan } from '../convex/artifactTestPlan'
import type { BrowserCase } from '../convex/artifactTestPlan'
const modules = import.meta.glob('../convex/**/*.ts')
const contract = 'OBJECTIVE: Double an input\nACCEPTANCE CRITERIA:\n- Input produces the expected doubled result\n- Empty required input is rejected\nRISKS:\n- Invalid input'
const content = '<!doctype html><html><body>Saved implementation</body></html>'
const plan: BrowserCase[] = [{ criterionIndex: 0, steps: [{ action: 'assertText', selector: '#result', value: '14' }] }]
const results = [[{ status: 'pass' as const, detail: 'Observed expected text: 14' }]]
const identity = (subject: string) => ({ subject, issuer: 'https://nexus-forge.test', tokenIdentifier: 'https://nexus-forge.test|' + subject })
async function fixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async ctx => {
    const missionId = await ctx.db.insert('missions', { title: 'Behavior test', mission: contract, autonomy: 'guided', budget: 0, status: 'draft', completion: 0, approved: false, ownerKey: 'owner-a' })
    const artifactId = await ctx.db.insert('artifacts', { missionId, name: 'Doubler', type: 'web-app', content, status: 'awaiting_approval', requiresApproval: true })
    return { missionId, artifactId }
  })
  return { t, owner: t.withIdentity(identity('owner-a')), ...ids, args: { artifactId: ids.artifactId, missionSnapshot: contract, artifactSnapshot: content, plan, results } }
}
describe('criterion-linked browser evidence', () => {
  it('extracts explicit criteria without treating later sections as requirements', () => {
    expect(extractAcceptanceCriteria(contract)).toEqual(['Input produces the expected doubled result', 'Empty required input is rejected'])
    expect(extractAcceptanceCriteria('Acceptance criteria: A user can finish the form\n\nBlueprint proposal: draft')).toEqual(['A user can finish the form'])
    expect(extractAcceptanceCriteria('Build a useful tool.')).toEqual([])
  })
  it('rejects interaction-only plans and vacuous text assertions', () => {
    expect(() => validateBrowserPlan(['A criterion'], [{ criterionIndex: 0, steps: [{ action: 'click', selector: '#go', value: '' }] }])).toThrow(/assertion/)
    expect(() => validateBrowserPlan(['A criterion'], [{ criterionIndex: 0, steps: [{ action: 'assertText', selector: 'body', value: '' }] }])).toThrow(/non-empty/)
  })
  it('keeps uncovered or unexecuted criteria from an all-passed result', () => {
    const criteria = extractAcceptanceCriteria(contract)
    expect(summarizeBrowserRun(criteria, plan, results)).toMatchObject({ passed: 1, covered: 1, total: 2, allPassed: false })
    expect(summarizeBrowserRun([criteria[0]], plan, [[{ status: 'not_run', detail: 'Stopped' }]])).toMatchObject({ notRun: 1, allPassed: false })
  })
  it('rejects anonymous and cross-owner recording and history reads', async () => {
    const { t, args, artifactId } = await fixture()
    await expect(t.mutation(api.artifactTests.record, args)).rejects.toThrow()
    const other = t.withIdentity(identity('owner-b'))
    await expect(other.mutation(api.artifactTests.record, args)).rejects.toThrow(/not found or access denied/i)
    await expect(other.query(api.artifactTests.list, { artifactId })).rejects.toThrow(/not found or access denied/i)
    await expect(other.query(api.artifactTests.listWithExactText, { artifactId })).rejects.toThrow(/not found or access denied/i)
    await expect(t.query(api.artifactTests.listWithExactText, { artifactId })).rejects.toThrow()
  })
  it('stores snapshots, per-step evidence, and an audit receipt without changing approval', async () => {
    const { t, owner, args, artifactId, missionId } = await fixture()
    await owner.mutation(api.artifactTests.record, args)
    const rows = await owner.query(api.artifactTests.list, { artifactId })
    expect(rows[0]).toMatchObject({ missionSnapshot: contract, artifactSnapshot: content, passed: 1, total: 2, allPassed: false, results })
    const state = await t.run(async ctx => ({ artifact: await ctx.db.get('artifacts', artifactId), mission: await ctx.db.get('missions', missionId), audit: await ctx.db.query('auditEvents').collect() }))
    expect(state.artifact).toMatchObject({ status: 'awaiting_approval', requiresApproval: true })
    expect(state.mission).toMatchObject({ status: 'draft', approved: false })
    expect(state.audit[0].eventType).toBe('artifact:browser_checks_recorded')
  })
  it('rejects stale artifact or mission snapshots and mismatched report shapes', async () => {
    const { owner, args } = await fixture()
    await expect(owner.mutation(api.artifactTests.record, { ...args, artifactSnapshot: 'Old content' })).rejects.toThrow(/changed/)
    await expect(owner.mutation(api.artifactTests.record, { ...args, missionSnapshot: 'Old mission' })).rejects.toThrow(/changed/)
    await expect(owner.mutation(api.artifactTests.record, { ...args, results: [] })).rejects.toThrow(/does not match/)
  })
  it('records actual reported failures instead of promoting an artifact', async () => {
    const { owner, args, artifactId } = await fixture()
    await owner.mutation(api.artifactTests.record, { ...args, results: [[{ status: 'fail', detail: 'Expected 14; observed 7' }]] })
    expect((await owner.query(api.artifactTests.list, { artifactId }))[0]).toMatchObject({ failed: 1, passed: 0, allPassed: false })
  })
})

describe('exact text evidence persistence', () => {
  it('accepts and retains exact-text plans with the updated runner identity', async () => {
    const { owner, args, artifactId } = await fixture()
    await owner.mutation(api.artifactTests.record, args)
    const exactPlan: BrowserCase[] = [{ criterionIndex: 0, steps: [{ action: 'assertTextEquals', selector: '#result', value: '' }] }]
    await owner.mutation(api.artifactTests.record, { ...args, plan: exactPlan })
    const rows = await owner.query(api.artifactTests.listWithExactText, { artifactId })
    expect(rows).toHaveLength(2)
    const legacy = await owner.query(api.artifactTests.list, { artifactId })
    expect(legacy).toHaveLength(1)
    expect(legacy[0].plan).toEqual(plan)
    expect(rows[0].plan).toEqual(exactPlan)
    expect(rows[0].runnerVersion).toBe('sandbox-dom-v2')
    expect(rows[0].allPassed).toBe(false)
    expect(() => validateBrowserPlan(['Cleared output'], exactPlan)).not.toThrow()
  })
})
