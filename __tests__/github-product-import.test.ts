import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://nexus-forge.test', tokenIdentifier: 'https://nexus-forge.test|' + subject })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
async function fixture() {
  const t = convexTest(schema, modules), owner = t.withIdentity(identity('owner-a'))
  const missionId = await owner.mutation(api.missions.create, { title: 'Product evidence import', mission: 'Import a committed outcome report with source identity', autonomy: 'guided', budget: 25, ownerKey: 'ignored' }) as Id<'missions'>
  const args = { missionId, commitSha: 'a'.repeat(40), reportId: 'pilot_1' }
  const path = 'nexus-forge-outcomes/' + missionId + '/pilot_1.json'
  const report = { version: 'product-outcome-v1', missionId, metric: 'task-success-rate', observed: 8, target: 75, sampleSize: 10, periodStart: Date.now() - 7200000, periodEnd: Date.now() - 3600000, method: 'Count completed tasks in a fixed trial population.', evidence: ['Trial export receipt 123'], notes: 'Repository-authored source observations.' }
  const bytes = Buffer.from(JSON.stringify(report))
  const metadata = { type: 'file', path, size: bytes.length, encoding: 'base64', sha: createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), content: bytes.toString('base64') }
  vi.stubEnv('GITHUB_ACCESS_TOKEN', 'test-server-token')
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(metadata), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return { t, owner, args, report, bytes, metadata, fetchMock, path }
}
describe('authenticated pinned GitHub product reports', () => {
  it('fetches exact project source, verifies byte identities and imports once with server-derived rates', async () => {
    const { t, owner, args, bytes, fetchMock, path } = await fixture()
    const id = await owner.action(api.productEvidenceImport.importReport, args)
    expect(await owner.action(api.productEvidenceImport.importReport, args)).toBe(id)
    const result = await owner.query(api.verification.productOutcomes, { paginationOpts: { numItems: 10, cursor: null } })
    expect(result.page).toHaveLength(1)
    expect(result.page[0]).toMatchObject({ actual: 80, targetMet: true, provenance: 'github-report', importReceipt: { path, commitSha: args.commitSha, repository: 'nexus-forge1/nexus-forge-', reportSha256: createHash('sha256').update(bytes).digest('hex') } })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/nexus-forge1/nexus-forge-/contents/' + path + '?ref=' + args.commitSha)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer test-server-token' }, redirect: 'error' })
    await t.run(async ctx => { expect(await ctx.db.get(args.missionId)).toMatchObject({ approved: false, completion: 0, status: 'draft' }) })
  })
  it('rejects unauthenticated and foreign mission access before external requests', async () => {
    const { t, args, fetchMock } = await fixture()
    await expect(t.action(api.productEvidenceImport.importReport, args)).rejects.toThrow()
    await expect(t.withIdentity(identity('owner-b')).action(api.productEvidenceImport.importReport, args)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('rejects unsafe source selectors and missing server access before fetching', async () => {
    const { owner, args, fetchMock } = await fixture()
    for (const patch of [{ reportId: '../other' }, { commitSha: 'main' }]) await expect(owner.action(api.productEvidenceImport.importReport, { ...args, ...patch })).rejects.toThrow()
    vi.stubEnv('GITHUB_ACCESS_TOKEN', '')
    await expect(owner.action(api.productEvidenceImport.importReport, args)).rejects.toThrow(/not configured/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('rejects mismatched blob and source metadata without saving', async () => {
    const { owner, args, metadata, fetchMock } = await fixture()
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ...metadata, sha: '0'.repeat(40) })))
    await expect(owner.action(api.productEvidenceImport.importReport, args)).rejects.toThrow(/blob identity/)
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ...metadata, path: 'other.json' })))
    await expect(owner.action(api.productEvidenceImport.importReport, args)).rejects.toThrow(/regular report file/)
    expect((await owner.query(api.verification.productOutcomes, { paginationOpts: { numItems: 10, cursor: null } })).page).toEqual([])
  })
  it('rejects report-supplied owner/status claims and wrong missions', async () => {
    const { owner, args, report, metadata, fetchMock } = await fixture()
    for (const patch of [{ ownerKey: 'owner-b' }, { targetMet: true }, { missionId: 'not-the-owned-mission' }, { version: 'other-version' }]) {
      const bytes = Buffer.from(JSON.stringify({ ...report, ...patch }))
      fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ...metadata, size: bytes.length, content: bytes.toString('base64'), sha: createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex') })))
      await expect(owner.action(api.productEvidenceImport.importReport, args)).rejects.toThrow(/contract/)
    }
  })
  it('bounds the response and does not disclose upstream error bodies', async () => {
    const { owner, args, fetchMock } = await fixture()
    fetchMock.mockResolvedValueOnce(new Response('private upstream diagnostic', { status: 403 }))
    await expect(owner.action(api.productEvidenceImport.importReport, args)).rejects.toThrow(/HTTP 403/)
    fetchMock.mockResolvedValueOnce(new Response('x'.repeat(131073)))
    await expect(owner.action(api.productEvidenceImport.importReport, args)).rejects.toThrow(/128 KiB/)
  })
})
