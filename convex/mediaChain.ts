"use node"
import {v,ConvexError} from 'convex/values'
import {action} from './_generated/server'
import {internal} from './_generated/api'
import {requireOperator} from './permissions'
import {mediaProviderConfig} from './mediaChainConfig'
import {MAX_MEDIA,cacheKey,ProviderError,bytes,checked,decode64,mediaMime,placeholderImage,placeholderAudio} from './mediaChainCore'
type Kind='image'|'music'
type Attempt={provider:string;status:string;httpStatus?:number;retryAfterMs?:number}
export const run=action({args:{requestKey:v.string(),kind:v.union(v.literal('image'),v.literal('music')),prompt:v.string(),width:v.optional(v.number()),height:v.optional(v.number()),durationSec:v.optional(v.number()),timeoutMs:v.optional(v.number()),researchMusic:v.optional(v.boolean())},handler:async(ctx,a):Promise<string>=>{
 const ownerKey=await requireOperator(ctx),prompt=a.prompt.trim(),o={width:a.width??1024,height:a.height??1024,durationSec:a.durationSec??10,timeoutMs:a.timeoutMs??45000,researchMusic:a.researchMusic??false}
 if(!prompt||prompt.length>2048||![o.width,o.height].every(n=>Number.isInteger(n)&&n>=256&&n<=1024&&n%64===0)||!Number.isInteger(o.durationSec)||o.durationSec<1||o.durationSec>30||!Number.isFinite(o.timeoutMs)||o.timeoutMs<1000||o.timeoutMs>45000)throw new ConvexError('Use a prompt up to 2048 characters, 256–1024 pixel sizes in multiples of 64, 1–30 seconds and 1–45 second timeouts')
 const key=cacheKey(a.kind,prompt,o),input=JSON.stringify({kind:a.kind,prompt,...o}),admission=await ctx.runMutation(internal.mediaChainState.begin,{ownerKey,requestKey:a.requestKey,input,key})
 if(admission.state==='complete')return admission.result
 if(admission.state==='pending')return JSON.stringify({kind:a.kind,pending:true,jobId:admission.jobId,provider:'pending',placeholder:false,cached:false,message:'An identical request is already in progress. No duplicate provider call was made. Review its runtime receipt.'})
 const env=mediaProviderConfig(process.env),attempts:Attempt[]=[],deadline=Date.now()+90000
 const fetchJson=async(url:string,body:unknown,token:string,signal:AbortSignal)=>JSON.parse((await bytes(await checked(await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'})),4000000)).toString('utf8'))
 const providers:{name:string;enabled:boolean;run:(signal:AbortSignal)=>Promise<Buffer>}[]=a.kind==='image'?[
  {name:'cloudflare-flux',enabled:!!(env.account&&env.cloudflare),run:async signal=>{if(o.width!==1024||o.height!==1024)throw Error('Cloudflare FLUX uses its default size');const j=await fetchJson('https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(env.account)+'/ai/run/@cf/black-forest-labs/flux-1-schnell',{prompt,steps:4},env.cloudflare,signal);if(j.success===false){if(/content.?filter|moderation|safety|nsfw/i.test(JSON.stringify(j.errors)))throw new ProviderError('policy',400);throw Error('Provider rejected result')}return decode64(j.result?.image)}},
  {name:'huggingface-flux',enabled:!!env.hf,run:async signal=>{const j=await fetchJson('https://router.huggingface.co/nscale/v1/images/generations',{model:'black-forest-labs/FLUX.1-schnell',prompt,width:o.width,height:o.height,response_format:'b64_json',num_inference_steps:4},env.hf,signal);return decode64(j.data?.[0]?.b64_json)}},
  {name:'pollinations',enabled:!!env.pollinations,run:async signal=>{const url=new URL('https://gen.pollinations.ai/image/'+encodeURIComponent(prompt));url.searchParams.set('model','flux');url.searchParams.set('width',String(o.width));url.searchParams.set('height',String(o.height));const res=await checked(await fetch(url,{headers:{Authorization:'Bearer '+env.pollinations},signal,redirect:'error'}));return bytes(res,MAX_MEDIA)}}
 ]:[{name:'huggingface-musicgen',enabled:!!env.hf&&o.researchMusic,run:async signal=>{
  const info=await checked(await fetch('https://huggingface.co/api/models/facebook/musicgen-small?expand=inferenceProviderMapping',{signal,redirect:'error'})),mapping=JSON.parse((await bytes(info,64000)).toString('utf8')).inferenceProviderMapping
  if(mapping?.['hf-inference']?.status!=='live')throw new ProviderError('unavailable',404,3600000)
  const res=await checked(await fetch('https://router.huggingface.co/hf-inference/models/facebook/musicgen-small',{method:'POST',headers:{Authorization:'Bearer '+env.hf,'Content-Type':'application/json'},body:JSON.stringify({inputs:prompt,parameters:{max_new_tokens:o.durationSec*50}}),signal,redirect:'error'}));return bytes(res,MAX_MEDIA)
 }}]
 let output:Buffer|undefined,provider='placeholder',policyRejected=false
 try{
  for(const p of providers){
   if(!p.enabled){attempts.push({provider:p.name,status:'not-configured-or-not-enabled'});continue}
   const until=await ctx.runQuery(internal.mediaChainState.cooldown,{ownerKey,provider:p.name})
   if(until>Date.now()){attempts.push({provider:p.name,status:'cooldown',retryAfterMs:until-Date.now()});continue}
   for(let attempt=0;attempt<2;attempt++){
    if(Date.now()>=deadline){attempts.push({provider:p.name,status:'request-time-budget-exhausted'});break}
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),Math.min(o.timeoutMs,deadline-Date.now()))
    try{const data=await p.run(ctrl.signal);mediaMime(data,a.kind);output=data;provider=p.name;attempts.push({provider:p.name,status:'generated'});break}
    catch(error){
     if(error instanceof ProviderError){attempts.push({provider:p.name,status:error.category,httpStatus:error.status,...(error.retryMs?{retryAfterMs:error.retryMs}:{})})
      if(error.category==='policy'){policyRejected=true;break}
      if(error.category==='rate-limit'||error.category==='unavailable'){await ctx.runMutation(internal.mediaChainState.cool,{ownerKey,provider:p.name,until:Date.now()+error.retryMs});if(attempt===0&&error.retryMs<=5000&&Date.now()+error.retryMs<deadline){clearTimeout(timer);await new Promise(r=>setTimeout(r,error.retryMs));continue}}
     }else attempts.push({provider:p.name,status:ctrl.signal.aborted?'timeout-result-uncertain':'invalid-response-or-provider-failure'})
     break
    }finally{clearTimeout(timer)}
   }
   if(output||policyRejected)break
  }
  const placeholder=!output,data=output??(a.kind==='image'?placeholderImage(prompt,o.width,o.height):placeholderAudio()),mime=mediaMime(data,a.kind),extension=mime==='audio/mpeg'?'mp3':mime.split('/')[1],name=(placeholder?'PLACEHOLDER-':'generated-')+a.kind+'.'+extension
  const storageId=await ctx.storage.store(new Blob([new Uint8Array(data)],{type:mime}))
  let mediaId;try{mediaId=await ctx.runMutation(internal.privateMedia.register,{ownerKey,storageId,mime,name,note:(placeholder?'PLACEHOLDER: '+(a.kind==='music'?'one second of silence; no music was generated. ':'deterministic color card; no AI image was generated. '):'Generated by '+provider+'. ')+(policyRejected?'Provider policy rejection stopped failover. ':'')+prompt})}catch(e){await ctx.storage.delete(storageId);throw e}
  const result=JSON.stringify({kind:a.kind,provider,mime,mediaId,cached:false,placeholder,policyRejected,attempts,billing:'unknown',...(a.kind==='music'?{requestedDurationSeconds:o.durationSec,...(placeholder?{actualDurationSeconds:1}:{durationVerified:false,usage:'MusicGen non-commercial research only'})}:{}),message:placeholder?(policyRejected?'The primary provider rejected the prompt under its policy. Failover stopped; this is a placeholder, not AI generation.':'Available generation paths were unavailable. This is an explicit placeholder, not successful AI generation.'):'Generated media saved privately; verify quality and provider usage.'})
  await ctx.runMutation(internal.mediaChainState.settle,{ownerKey,key,jobId:admission.jobId,result,success:true,cacheable:!placeholder});return result
 }catch{await ctx.runMutation(internal.mediaChainState.settle,{ownerKey,key,jobId:admission.jobId,result:'Media persistence or runtime failed. Review this receipt before retrying. Billing is unknown.',success:false,cacheable:false});throw new ConvexError('Media chain failed; review its durable receipt before retrying')}
}})
