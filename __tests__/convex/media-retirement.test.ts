// @vitest-environment edge-runtime
import {afterEach,describe,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../../convex/schema'
import {api,internal} from '../../convex/_generated/api'
const modules=import.meta.glob('../../convex/**/*.ts')
afterEach(()=>vi.unstubAllGlobals())
describe('Multimodal Studio retirement',()=>{
 it('rejects every legacy generation entry point without network, receipt or storage writes',async()=>{
  const t=convexTest(schema,modules),owner=t.withIdentity({subject:'owner'}),network=vi.fn();vi.stubGlobal('fetch',network)
  const calls=[
   ()=>owner.action(api.mediaChain.run,{requestKey:'retired-chain',kind:'image',prompt:'fixture'}),
   ()=>owner.action(api.mediaChain.run,{requestKey:'retired-music',kind:'music',prompt:'fixture'}),
   ()=>owner.action(api.geminiMedia.run,{requestKey:'retired-gemini',mode:'image',prompt:'fixture'}),
   ()=>owner.action(api.geminiMedia.run,{requestKey:'retired-gemini',mode:'music',prompt:'fixture'}),
   ()=>owner.action(api.geminiMedia.run,{requestKey:'retired-gemini',mode:'video',prompt:'fixture'}),
   ...(['generate','describe','transcribe','video-frames'] as const).map(mode=>()=>owner.action(api.multimodalRuntime.run,{requestKey:'retired-runtime',mode,prompt:'fixture',mediaIds:[],timestamps:[]})),
   ()=>owner.action(api.privateMedia.upload,{name:'fixture.txt',mime:'text/plain',note:'',base64:btoa('fixture')})
  ]
  for(const call of calls)await expect(call()).rejects.toThrow(/has been removed/)
  expect(network).not.toHaveBeenCalled()
  for(const table of ['privateMedia','runtimeJobs','mediaChainEntries','mediaChainCooldowns'] as const)expect(await t.run(ctx=>ctx.db.query(table).collect())).toEqual([])
  expect(await t.run(ctx=>ctx.db.system.query('_storage').collect())).toEqual([])
  await expect(t.action(api.mediaChain.run,{requestKey:'anonymous',kind:'image',prompt:'fixture'})).rejects.toThrow(/Authenticated/)
  expect(await owner.query(api.mediaChainState.readiness,{})).toMatchObject({cloudflare:false,huggingface:false,pollinations:false})
  expect(await owner.query(api.geminiMedia.readiness,{})).toMatchObject({configured:false})
 })
 it('preserves historical private files and ownership while refusing new registration',async()=>{
  const t=convexTest(schema,modules),owner=t.withIdentity({subject:'owner'}),other=t.withIdentity({subject:'other'})
  const {id,storageId}=await t.run(async ctx=>{const storageId=await ctx.storage.store(new Blob(['private'],{type:'text/plain'}));const id=await ctx.db.insert('privateMedia',{ownerKey:'owner',storageId,name:'existing.txt',note:'Historical asset',mime:'text/plain',size:7,sha256:'a'.repeat(64),createdAt:1});return{id,storageId}})
  await expect(t.mutation(internal.privateMedia.register,{ownerKey:'owner',storageId,name:'new.txt',note:'',mime:'text/plain'})).rejects.toThrow(/has been removed/)
  expect(await owner.query(api.privateMedia.list,{})).toHaveLength(1)
  expect(await other.query(api.privateMedia.list,{})).toEqual([])
  await expect(other.action(api.privateMedia.download,{mediaId:id})).rejects.toThrow(/access denied/)
  await expect(t.action(api.privateMedia.download,{mediaId:id})).rejects.toThrow(/Authenticated/)
  expect(await owner.action(api.privateMedia.download,{mediaId:id})).toMatchObject({name:'existing.txt',base64:btoa('private')})
  expect(await t.run(ctx=>ctx.db.query('privateMedia').collect())).toHaveLength(1)
 })
})
