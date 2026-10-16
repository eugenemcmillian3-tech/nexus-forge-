// @vitest-environment edge-runtime
import {describe,it,expect} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../../convex/schema'
import {api,internal} from '../../convex/_generated/api'
import type {Id} from '../../convex/_generated/dataModel'
const modules=import.meta.glob('../../convex/**/*.ts')
function fixture(){const t=convexTest(schema,modules);return{t,owner:t.withIdentity({subject:'owner'}),other:t.withIdentity({subject:'other'})}}
describe('active record admission capacity',()=>{
 it('retains media history while excluding it from active admission and the active workbench',async()=>{
  const{t,owner,other}=fixture()
  await owner.mutation(api.frontierControls.setPolicy,{maxRecords:1,maxMediaBytes:1024})
  const ids=await t.run(async ctx=>{const ids:Id<'runtimeJobs'>[]=[];for(let i=0;i<120;i++)ids.push(await ctx.db.insert('runtimeJobs',{ownerKey:'owner',requestKey:'old-media-'+i,kind:['multimodal','gemini-media','media-chain'][i%3],input:'{}',status:'complete',result:'Historical fixture',createdAt:1}));return ids})
  const before=await t.run(ctx=>ctx.db.query('runtimeJobs').collect())
  const initial=await owner.query(api.resourceCapacity.overview,{})
  expect(initial.rows.find(r=>r.id==='runtime')).toMatchObject({count:0,remaining:1,blocked:false,complete:true})
  const job=await t.mutation(internal.runtimeReceipts.admit,{ownerKey:'owner',requestKey:'active-request-001',kind:'external-agent',input:'{}'})
  expect((await owner.query(api.runtimeReceipts.activeList,{})).map(r=>r._id)).toEqual([job.jobId])
  expect(await other.query(api.runtimeReceipts.activeList,{})).toEqual([])
  await expect(t.query(api.runtimeReceipts.activeList,{})).rejects.toThrow(/Authenticated/)
  const after=await t.run(ctx=>Promise.all(ids.map(id=>ctx.db.get(id))))
  expect(after).toEqual(before)
  expect(await owner.query(api.runtimeReceipts.list,{})).toHaveLength(50)
  await expect(t.mutation(internal.runtimeReceipts.admit,{ownerKey:'owner',requestKey:'another-request-001',kind:'external-agent',input:'{}'})).rejects.toThrow(/quota/)
  expect((await owner.query(api.resourceCapacity.overview,{})).rows.find(r=>r.id==='runtime')).toMatchObject({count:1,remaining:0,blocked:true})
 })
 it('refuses new retired admission and preserves pending, failed and conflicting replay guards',async()=>{
  const{t}=fixture()
  for(const kind of ['multimodal','gemini-media','media-chain'])await expect(t.mutation(internal.runtimeReceipts.admit,{ownerKey:'owner',requestKey:'retired-request-001',kind,input:'{}'})).rejects.toThrow(/removed/)
  const a={ownerKey:'owner',requestKey:'active-request-001',kind:'external-agent',input:'{}'},job=await t.mutation(internal.runtimeReceipts.admit,a)
  await expect(t.mutation(internal.runtimeReceipts.admit,a)).rejects.toThrow(/already attempted/)
  await t.mutation(internal.runtimeReceipts.finish,{jobId:job.jobId,status:'failed',result:'uncertain'})
  await expect(t.mutation(internal.runtimeReceipts.admit,a)).rejects.toThrow(/already attempted/)
  await expect(t.mutation(internal.runtimeReceipts.admit,{...a,input:'changed'})).rejects.toThrow(/conflicts/)
 })
 it('isolates owners and exposes only bounded counts aligned with policy and fixed limits',async()=>{
  const{t,owner,other}=fixture()
  await expect(t.query(api.resourceCapacity.overview,{})).rejects.toThrow(/Authenticated/)
  await owner.mutation(api.frontierControls.setPolicy,{maxRecords:2,maxMediaBytes:1024})
  await t.run(async ctx=>{
   for(let i=0;i<5;i++)await ctx.db.insert('extensionPackages',{ownerKey:'owner',name:'fixture-'+i,version:'1.0.0',description:'Private description',inputFields:['query'],outputFields:['answer'],status:'retired',createdAt:1})
   for(const kind of ['comparison','science','generality'] as const)await ctx.db.insert('labProtocols',{ownerKey:'owner',kind,title:'Private protocol',hypothesis:'Fixture',metric:'score',unit:'points',direction:'higher',target:1,minimumSamples:2,domains:['planning'],heldOutDomains:[],status:'closed',createdAt:1})
   await ctx.db.insert('benchmarkRuns',{ownerKey:'owner',version:'private-version',report:'private result',createdAt:1})
   const missionId=await ctx.db.insert('missions',{ownerKey:'owner',title:'Private mission',mission:'Fixture',autonomy:'governed',budget:0,status:'draft',completion:0,approved:false})
   await ctx.db.insert('outcomeFeeds',{ownerKey:'owner',missionId,reportId:'private-report',enabled:false,generation:1,updatedAt:1})
   await ctx.db.insert('productSources',{ownerKey:'owner',missionId,name:'Private source',tokenHash:'a'.repeat(64),enabled:false,generation:1,received:0,pendingCount:0,pendingSuccess:0,batch:0,createdAt:1})
  })
  const result=await owner.query(api.resourceCapacity.overview,{})
  expect(result.rows.find(r=>r.id==='packages')).toMatchObject({count:3,complete:false,limit:2,remaining:0,blocked:true})
  for(const id of ['comparison','science','generality','benchmarks'])expect(result.rows.find(r=>r.id===id)).toMatchObject({count:1,complete:true,remaining:1,limit:2})
  for(const id of ['feeds','sources'])expect(result.rows.find(r=>r.id===id)).toMatchObject({count:1,limit:20,remaining:19})
  for(const secret of ['Private description','Private protocol','Private mission','Private source','private-version','private-report','private result'])expect(JSON.stringify(result)).not.toContain(secret)
  expect(JSON.stringify(result)).not.toContain('a'.repeat(64))
  const foreign=await other.query(api.resourceCapacity.overview,{})
  expect(foreign.rows.every(r=>r.count===0)).toBe(true)
 })
 it('allows one concurrent active admission at capacity and excludes retained media without weakening the cap',async()=>{
  const{t,owner}=fixture()
  await owner.mutation(api.frontierControls.setPolicy,{maxRecords:1,maxMediaBytes:1024})
  const results=await Promise.allSettled(['first-active-001','second-active-001'].map(requestKey=>t.mutation(internal.runtimeReceipts.admit,{ownerKey:'owner',requestKey,kind:'external-agent',input:'{}'})))
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  expect((await owner.query(api.runtimeReceipts.activeList,{}))).toHaveLength(1)
 })
})
