// @vitest-environment edge-runtime
import {afterEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../../convex/schema'
import {api} from '../../convex/_generated/api'
import {placeholderImage,placeholderAudio,retryAfter,bytes} from '../../convex/mediaChainCore'
const modules=import.meta.glob('../../convex/**/*.ts'),args={requestKey:'chain-request-001',kind:'image' as const,prompt:'Controlled fixture'}
const png=()=>placeholderImage('fixture',256,256).toString('base64')
function fixture(){const t=convexTest(schema,modules);return{t,owner:t.withIdentity({subject:'owner'}),other:t.withIdentity({subject:'other'})}}
function configured(){vi.stubEnv('CLOUDFLARE_ACCOUNT_ID','fixture');vi.stubEnv('CLOUDFLARE_API_TOKEN','fixture');vi.stubEnv('HF_TOKEN','fixture');vi.stubEnv('POLLINATIONS_API_KEY','');vi.stubEnv('CF_ACCOUNT_ID','');vi.stubEnv('CF_API_TOKEN','')}
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
it('fails over on 429, validates Nscale output, caches privately and honors owner isolation',async()=>{
 configured();const{owner,other}=fixture(),network=vi.fn(async(url:unknown)=>String(url).includes('cloudflare')?new Response('limit',{status:429,headers:{'retry-after':'30'}}):Response.json({data:[{b64_json:png()}]}));vi.stubGlobal('fetch',network)
 const first=JSON.parse(await owner.action(api.mediaChain.run,args));expect(first).toMatchObject({provider:'huggingface-flux',placeholder:false,cached:false});expect(network).toHaveBeenCalledTimes(2)
 expect(JSON.parse(await owner.action(api.mediaChain.run,{...args,requestKey:'chain-request-002'})).cached).toBe(true);expect(await owner.action(api.mediaChain.run,args)).toBe(JSON.stringify(first));expect(network).toHaveBeenCalledTimes(2)
 await expect(other.action(api.privateMedia.download,{mediaId:first.mediaId})).rejects.toThrow(/denied/)
 await other.action(api.mediaChain.run,args);expect(network).toHaveBeenCalledTimes(4)
 await expect(owner.action(api.mediaChain.run,{...args,prompt:'Conflicting'})).rejects.toThrow(/conflicts/)
})
it('uses credential aliases and collapses simultaneous identical requests into one provider call',async()=>{
 configured();vi.stubEnv('CF_ACCOUNT_ID','alias-account');vi.stubEnv('CF_API_TOKEN','alias-token');const{owner}=fixture()
 let release:()=>void=()=>{};const gate=new Promise<void>(r=>{release=r}),network=vi.fn(async(_url:unknown)=>{await gate;return Response.json({success:true,result:{image:png()}})});vi.stubGlobal('fetch',network)
 const first=owner.action(api.mediaChain.run,args);await vi.waitFor(()=>expect(network).toHaveBeenCalledTimes(1))
 const second=JSON.parse(await owner.action(api.mediaChain.run,{...args,requestKey:'chain-concurrent-002'}));expect(second.pending).toBe(true);expect(network).toHaveBeenCalledTimes(1);release();expect(JSON.parse(await first).placeholder).toBe(false);expect(String(network.mock.calls[0][0])).toContain('alias-account')
})
it('stops on content rejection and retains a labeled placeholder without invoking another provider',async()=>{
 configured();const{owner}=fixture(),network=vi.fn(async()=>Response.json({errors:[{code:8007,message:'Content filter rejected request'}]},{status:400}));vi.stubGlobal('fetch',network)
 const r=JSON.parse(await owner.action(api.mediaChain.run,args));expect(r).toMatchObject({placeholder:true,policyRejected:true,provider:'placeholder'});expect(network).toHaveBeenCalledTimes(1);expect((await owner.query(api.privateMedia.list,{}))[0].name).toBe('PLACEHOLDER-image.png')
 const receipt=(await owner.query(api.runtimeReceipts.list,{}))[0];expect(receipt.result).toContain('"placeholder":true');expect(receipt.result).not.toContain(png())
})
it('does not cache placeholders as generation and shares durable cooldown across different prompts',async()=>{
 configured();const{owner}=fixture(),network=vi.fn(async()=>new Response('busy',{status:429,headers:{'retry-after':'30'}}));vi.stubGlobal('fetch',network)
 expect(JSON.parse(await owner.action(api.mediaChain.run,args)).placeholder).toBe(true);expect(network).toHaveBeenCalledTimes(2)
 const r=JSON.parse(await owner.action(api.mediaChain.run,{...args,requestKey:'chain-cooldown-002',prompt:'Second controlled fixture'}));expect(r.placeholder).toBe(true);expect(r.cached).toBe(false);expect(r.attempts.filter((a:any)=>a.status==='cooldown')).toHaveLength(2);expect(network).toHaveBeenCalledTimes(2)
})
it('honors one short Retry-After and never loops on continuing rate limits',async()=>{
 configured();const{owner}=fixture(),network=vi.fn(async()=>new Response('busy',{status:503,headers:{'retry-after':'0'}}));vi.stubGlobal('fetch',network)
 const r=JSON.parse(await owner.action(api.mediaChain.run,args));expect(r.placeholder).toBe(true);expect(network).toHaveBeenCalledTimes(4)
})
it('rejects HTML bodies posing as images and never treats a placeholder as AI output',async()=>{
 configured();vi.stubEnv('CLOUDFLARE_API_TOKEN','');vi.stubEnv('HF_TOKEN','');vi.stubEnv('POLLINATIONS_API_KEY','fixture');const{owner}=fixture()
 const network=vi.fn(async()=>new Response('<html>not an image</html>',{headers:{'content-type':'image/png'}}));vi.stubGlobal('fetch',network)
 const r=JSON.parse(await owner.action(api.mediaChain.run,args));expect(r.placeholder).toBe(true);expect(r.attempts[2].status).toBe('invalid-response-or-provider-failure')
})
it('outputs one-second silent WAV when no music provider is enabled and skips unsupported MusicGen hosting',async()=>{
 configured();const{owner}=fixture(),network=vi.fn(async()=>Response.json({inferenceProviderMapping:{}}));vi.stubGlobal('fetch',network)
 const silent=JSON.parse(await owner.action(api.mediaChain.run,{...args,kind:'music'}));expect(silent).toMatchObject({placeholder:true,actualDurationSeconds:1});expect(network).not.toHaveBeenCalled()
 const attempted=JSON.parse(await owner.action(api.mediaChain.run,{...args,requestKey:'chain-research-002',kind:'music',researchMusic:true}));expect(attempted.placeholder).toBe(true);expect(network).toHaveBeenCalledTimes(1);expect(attempted.attempts[0]).toMatchObject({status:'unavailable',httpStatus:404})
 const d=await owner.action(api.privateMedia.download,{mediaId:silent.mediaId});expect(d.mime).toBe('audio/wav');expect(Buffer.from(d.base64,'base64')).toEqual(placeholderAudio())
})
it('requires authentication and rejects invalid options before making requests',async()=>{
 const{t,owner}=fixture(),network=vi.fn();vi.stubGlobal('fetch',network);await expect(t.action(api.mediaChain.run,args)).rejects.toThrow()
 for(const extra of [{width:0},{height:999},{timeoutMs:Infinity},{durationSec:31},{prompt:' '}])await expect(owner.action(api.mediaChain.run,{...args,...extra})).rejects.toThrow();expect(network).not.toHaveBeenCalled()
})
it('parses HTTP date cooldowns, clamps invalid values and cancels oversized response streams',async()=>{
 expect(retryAfter('-2')).toBe(0);expect(retryAfter('invalid')).toBe(30000);expect(retryAfter('Fri, 16 Oct 2026 00:00:05 GMT',30000,Date.parse('2026-10-16T00:00:00Z'))).toBe(5000)
 const cancel=vi.fn(),r=new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(20))},cancel}));await expect(bytes(r,10)).rejects.toThrow(/limit/);expect(cancel).toHaveBeenCalled()
})
