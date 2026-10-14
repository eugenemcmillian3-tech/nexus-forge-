import { afterEach, describe, expect, it, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'
import { parseTrafficResponse, trafficChat, trafficSite } from '../convex/siteTrafficModel'
import type { Id } from '../convex/_generated/dataModel'
const modules = import.meta.glob('../convex/**/*.ts')
const identity = (subject: string) => ({ subject, issuer: 'https://nexus-forge.test', tokenIdentifier: 'https://nexus-forge.test|' + subject })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
async function fixture() {
  const t = convexTest(schema, modules), owner = t.withIdentity(identity('owner-a'))
  const missionId = await owner.mutation(api.missions.create, { title: 'Traffic review', mission: 'Review site-wide traffic without attributing it to product adoption', autonomy: 'guided', budget: 0, ownerKey: 'ignored' }) as Id<'missions'>
  const args = { missionId, periodStart: Date.now() - 7200000, periodEnd: Date.now() - 3600000, acknowledgeSiteScope: true }
  vi.stubEnv('MACALY_CHAT_ID', trafficChat); vi.stubEnv('MACALY_BASE_URL', 'https://www.macaly.com'); vi.stubEnv('MACALY_API_TOKEN', 'test-managed-token')
  const response = { siteId: trafficSite, data: { visitors: { total: 0 }, visits: { total: 0 }, pageviews: { total: 0 }, bounceRate: { total: 0 } } }
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(response)))
  vi.stubGlobal('fetch', fetchMock)
  return { t, owner, args, response, fetchMock }
}
describe('managed direct site analytics evidence', () => {
  it('stores true zero counts and exact source snapshots once without product or completion claims', async () => {
    const { t, owner, args, response, fetchMock } = await fixture()
    const id = await owner.action(api.siteTraffic.retrieveAndSave, args)
    expect(await owner.action(api.siteTraffic.retrieveAndSave, args)).toBe(id)
    const result = await owner.query(api.verification.siteTrafficHistory, { paginationOpts: { numItems: 5, cursor: null } })
    expect(result.page).toHaveLength(1)
    expect(result.page[0]).toMatchObject({ source: 'macaly-site-analytics', metrics: { visitors: 0, visits: 0, pageviews: 0, bounceRate: 0 }, rawResponse: JSON.stringify(response) })
    expect(result.page[0].reportSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ chatId: trafficChat, domain: trafficSite, queryType: 'get-dashboard-data-v2', period: { from: args.periodStart, to: args.periodEnd } })
    await t.run(async ctx => { expect(await ctx.db.query('productOutcomes').collect()).toEqual([]); expect(await ctx.db.get(args.missionId)).toMatchObject({ approved: false, status: 'draft', completion: 0 }) })
  })
  it('rejects anonymous/foreign reads and scope acknowledgement failures before requests', async () => {
    const { t, owner, args, fetchMock } = await fixture()
    await expect(t.action(api.siteTraffic.retrieveAndSave, args)).rejects.toThrow()
    await expect(t.withIdentity(identity('owner-b')).action(api.siteTraffic.retrieveAndSave, args)).rejects.toThrow()
    await expect(owner.action(api.siteTraffic.retrieveAndSave, { ...args, acknowledgeSiteScope: false })).rejects.toThrow(/site-wide/)
    expect(fetchMock).not.toHaveBeenCalled()
    await expect(t.query(api.verification.siteTrafficHistory, { paginationOpts: { numItems: 5, cursor: null } })).rejects.toThrow()
  })
  it('bounds periods and fails missing managed connection before external requests', async () => {
    const { owner, args, fetchMock } = await fixture()
    for (const patch of [{ periodEnd: Date.now() + 3600000 }, { periodStart: args.periodEnd }, { periodStart: args.periodEnd - 91 * 86400000 }]) await expect(owner.action(api.siteTraffic.retrieveAndSave, { ...args, ...patch })).rejects.toThrow(/completed period/)
    vi.stubEnv('MACALY_API_TOKEN', '')
    await expect(owner.action(api.siteTraffic.retrieveAndSave, args)).rejects.toThrow(/connection is unavailable/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('keeps changed provider snapshots separately and isolates owner history', async () => {
    const { t, owner, args, response, fetchMock } = await fixture()
    await owner.action(api.siteTraffic.retrieveAndSave, args)
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ...response, data: { ...response.data, pageviews: { total: 10 } } })))
    await owner.action(api.siteTraffic.retrieveAndSave, args)
    const first = await owner.query(api.verification.siteTrafficHistory, { paginationOpts: { numItems: 1, cursor: null } })
    expect(first.page).toHaveLength(1); expect(first.isDone).toBe(false)
    const next = await owner.query(api.verification.siteTrafficHistory, { paginationOpts: { numItems: 1, cursor: first.continueCursor } })
    expect(next.page).toHaveLength(1)
    expect((await t.withIdentity(identity('owner-b')).query(api.verification.siteTrafficHistory, { paginationOpts: { numItems: 5, cursor: null } })).page).toEqual([])
  })
  it('rejects wrong site, missing counts and invalid metrics instead of assuming zero', () => {
    const data = { visitors: { total: 2 }, visits: { total: 3 }, pageviews: { total: 5 } }
    expect(parseTrafficResponse(JSON.stringify({ siteId: trafficSite, data }))).toEqual({ visitors: 2, visits: 3, pageviews: 5 })
    for (const value of [{ siteId: 'other.example', data }, { siteId: trafficSite, data: {} }, { siteId: trafficSite, data: { ...data, visitors: { total: -1 } } }, { siteId: trafficSite, data: { ...data, bounceRate: { total: 2 } } }]) expect(() => parseTrafficResponse(JSON.stringify(value))).toThrow()
  })
  it('sanitizes failed upstream lookups and bounds response bodies', async () => {
    const { owner, args, fetchMock } = await fixture()
    fetchMock.mockResolvedValueOnce(new Response('private upstream body', { status: 403 }))
    await expect(owner.action(api.siteTraffic.retrieveAndSave, args)).rejects.toThrow(/HTTP 403/)
    fetchMock.mockResolvedValueOnce(new Response('x'.repeat(32769)))
    await expect(owner.action(api.siteTraffic.retrieveAndSave, args)).rejects.toThrow(/32 KiB/)
  })
})
