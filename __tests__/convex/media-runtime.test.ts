// @vitest-environment edge-runtime
import {afterEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../../convex/schema'
import {api} from '../../convex/_generated/api'
const modules=import.meta.glob('../../convex/**/*.ts')
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
it('runs image generation, audio transcription and three-frame perception while retaining private provenance',async()=>{
 const t=convexTest(schema,modules),owner=t.withIdentity({subject:'owner'});vi.stubEnv('CLOUDFLARE_API_TOKEN','fixture');vi.stubEnv('CLOUDFLARE_ACCOUNT_ID','fixture');
 const network=vi.fn(async(url:any)=>Response.json({success:true,result:String(url).includes('flux')?{image:btoa('fixture jpeg')}:String(url).includes('whisper')?{text:'Fixture transcript'}:{description:'Fixture frame'}}));vi.stubGlobal('fetch',network);
 const generated=JSON.parse(await owner.action(api.multimodalRuntime.run,{requestKey:'generated-key-001',mode:'generate',prompt:'Controlled fixture',mediaIds:[],timestamps:[]}));expect(generated.billing).toBe('unknown');expect((await owner.query(api.privateMedia.list,{}))[0]._id).toBe(generated.mediaId);
 const audio=await owner.action(api.privateMedia.upload,{name:'fixture.wav',note:'Synthetic fixture',mime:'audio/wav',base64:btoa('fixture audio')});expect(await owner.action(api.multimodalRuntime.run,{requestKey:'transcribe-key-001',mode:'transcribe',prompt:'',mediaIds:[audio as any],timestamps:[]})).toContain('Fixture transcript');
 const video=JSON.parse(await owner.action(api.multimodalRuntime.run,{requestKey:'video-key-001',mode:'video-frames',prompt:'',mediaIds:[generated.mediaId,generated.mediaId,generated.mediaId],timestamps:[0,2,4]}));expect(video.outputs.map((o:any)=>o.sampledAtSeconds)).toEqual([0,2,4]);expect(video.scope).toContain('Only supplied sampled frames');expect(network).toHaveBeenCalledTimes(5);
 await expect(owner.action(api.multimodalRuntime.run,{requestKey:'bad-video-key-001',mode:'video-frames',prompt:'',mediaIds:[generated.mediaId,generated.mediaId],timestamps:[2,1]})).rejects.toThrow(/Ordered/);
 await expect(owner.action(api.multimodalRuntime.run,{requestKey:'bad-audio-key-001',mode:'transcribe',prompt:'',mediaIds:[generated.mediaId],timestamps:[]})).rejects.toThrow(/audio/);
})
it.each(['truncated','redirect','fields'])('rejects %s external evidence and retains failed receipt',async(reason)=>{
 const t=convexTest(schema,modules),owner=t.withIdentity({subject:'owner'});vi.stubEnv('RESEARCH_EGRESS_GATEWAY_URL','https://gateway.example.com');vi.stubEnv('RESEARCH_EGRESS_GATEWAY_TOKEN','fixture');const packageId=await owner.mutation(api.frontierControls.registerPackage,{name:'response-adapter',version:'1.0.0',description:'Response contract fixture',inputFields:['query'],outputFields:['answer']});await owner.mutation(api.frontierControls.validatePackage,{packageId,input:'{"query":"x"}',output:'{"answer":"x"}'});const adapterId=await owner.mutation(api.externalRuntime.register,{packageId,endpoint:'https://agent.example.com/answer'});
 vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{const a=JSON.parse(init.body);return Response.json({ok:true,status:200,contentType:'application/json',body:reason==='fields'?'{"extra":"untrusted"}':'{"answer":"x"}',finalUrl:reason==='redirect'?'https://other.example.com/':a.url,hops:[a.url],truncated:reason==='truncated'})}));
 await expect(owner.action(api.externalRuntime.run,{adapterId,requestKey:'response-key-001',input:'{"query":"x"}'})).rejects.toThrow(/receipt/);expect((await owner.query(api.runtimeReceipts.list,{}))[0].status).toBe('failed')
})
