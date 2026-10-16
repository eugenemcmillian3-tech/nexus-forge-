import {afterEach,describe,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api} from '../convex/_generated/api'
const modules=import.meta.glob('../convex/**/*.ts')
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
describe('QA recovery preflight',()=>{
 it('preserves dispatched delivery and approvals when workflow lacks callback input',async()=>{
  const t=convexTest(schema,modules)
  const missionId=await t.run(c=>c.db.insert('missions',{ownerKey:'qa-owner',title:'QA retry',mission:'Verify QA delivery',status:'running',autonomy:'Approval required',budget:0,approved:true,completion:0}))
  const id=await t.run(c=>c.db.insert('deliveries',{missionId,target:'nexus-forge1/no-dispatch',branch:'qa-only',stage:'github',approved:true,status:'GitHub Actions dispatched',evidence:'Original dispatch evidence',createdAt:Date.now()}))
  const run={id:123,status:'completed',conclusion:'failure',head_branch:'qa-only',event:'workflow_dispatch',path:'.github/workflows/nexus-forge-delivery.yml',head_commit:{message:'nexus-forge: deliver '+id},html_url:'https://github.com/nexus-forge1/no-dispatch/actions/runs/123'}
  vi.stubEnv('GITHUB_ACCESS_TOKEN','test-only')
  const mocked=vi.fn().mockResolvedValueOnce(Response.json({workflow_runs:[run]})).mockResolvedValueOnce(Response.json({encoding:'base64',content:btoa('name: old workflow')}))
  vi.stubGlobal('fetch',mocked)
  const before=await t.run(c=>c.db.get(id))
  const result=await t.withIdentity({subject:'qa-owner'}).action(api.delivery.reviewFailedQaRun,{id,runId:'123'})
  expect(result.ok).toBe(false);expect(result.message).toContain('QA workflow upgrade required')
  expect(await t.run(c=>c.db.get(id))).toEqual(before)
  expect(mocked).toHaveBeenCalledTimes(2)
  await expect(t.withIdentity({subject:'other'}).action(api.delivery.reviewFailedQaRun,{id,runId:'123'})).rejects.toThrow()
  expect(mocked).toHaveBeenCalledTimes(2)
 })
})
