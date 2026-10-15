import {ConvexError,v} from 'convex/values'
import {action,query} from './_generated/server'
import {internal} from './_generated/api'
import {requireOperator} from './permissions'
import {boundedText} from './boundedResponse'
const mode=v.union(v.literal('image'),v.literal('music'),v.literal('video'))
const models={image:'gemini-nano-banana-2.1',music:'lyria-3-clip-preview',video:'gemini-3.8-flash'} as const
const key=()=> (process.env.GOOGLE_GEMINI_API_KEY||process.env.GEMINI_API_KEY)?.trim().replace(/^["']|["']$/g,'')
const object=(x:unknown):Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{}
function encode(bytes:Uint8Array){let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(raw)}
export const readiness=query({args:{},handler:async(ctx)=>{await requireOperator(ctx);return{configured:!!key(),models,maxBytes:2*1024*1024,musicSeconds:30}}})
export const run=action({args:{requestKey:v.string(),mode,prompt:v.string(),mediaId:v.optional(v.id('privateMedia'))},handler:async(ctx,a):Promise<string>=>{
 const ownerKey=await requireOperator(ctx);
 if(!a.prompt.trim()||a.prompt.length>2048)throw new ConvexError('A prompt of 1–2048 characters is required');
 if((a.mode==='video')!==!!a.mediaId)throw new ConvexError('Select one private video only for video analysis');
 const token=key();if(!token)throw new ConvexError('Gemini server key is not configured');
 const media=a.mediaId?await ctx.runQuery(internal.privateMedia.owned,{mediaId:a.mediaId}):null;
 if(media&&!['video/mp4','video/webm'].includes(media.mime))throw new ConvexError('MP4 or WebM video required');
 const input:Record<string,unknown>[]=[{type:'text',text:a.mode==='video'?a.prompt+'\nReport observed timestamps, distinguish audio from visuals, and state uncertainty. Do not claim exhaustive frame coverage.':a.prompt}];
 if(media){const blob=await ctx.storage.get(media.storageId);if(!blob||!blob.size||blob.size>2*1024*1024)throw new ConvexError('Private video must contain 1 byte to 2 MiB');input.push({type:'video',mime_type:media.mime,data:encode(new Uint8Array(await blob.arrayBuffer()))})}
 const admission=await ctx.runMutation(internal.runtimeReceipts.admit,{ownerKey,requestKey:a.requestKey,kind:'gemini-media',input:JSON.stringify(a)});if(admission.cached)return admission.cached;
 let providerStatus:number|undefined;
 try{
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':token},body:JSON.stringify({model:models[a.mode],input,store:false}),redirect:'error',signal:AbortSignal.timeout(180000)});
  providerStatus=response.status;if(!response.ok){await response.body?.cancel();throw Error('Provider rejected request')}
  const payload=object(JSON.parse(await boundedText(response,4000000)));
  if(payload.status!==undefined&&payload.status!=='completed')throw Error('Provider did not complete');
  const blocks:Record<string,unknown>[]=[];
  for(const step of Array.isArray(payload.steps)?payload.steps:[]){const s=object(step);if(s.type==='model_output'&&Array.isArray(s.content))for(const block of s.content)blocks.push(object(block))}
  const text=blocks.filter(b=>b.type==='text'&&typeof b.text==='string').map(b=>b.text as string).join('\n');
  if(text.length>12000)throw Error('Text response too large');
  const result:Record<string,unknown>={provider:'google',model:models[a.mode],billing:'unknown',text,scope:a.mode==='video'?'The original private video was submitted. Model sampling and inference may miss events; verify timestamps and audio claims.':'Generated content; verify quality before use.'};
  if(a.mode==='video'){if(!text.trim())throw Error('Missing video analysis');result.source={mediaId:media!._id,sha256:media!.sha256}}
  else{
   const outputs=blocks.filter(b=>b.type===(a.mode==='music'?'audio':'image'));
   if(outputs.length!==1)throw Error('Expected one generated asset');
   const b=outputs[0],mime=b.mime_type??(a.mode==='music'?'audio/mpeg':'image/png');
   if(typeof mime!=='string'||!(a.mode==='music'?['audio/mpeg','audio/mp3']:['image/png','image/jpeg','image/webp']).includes(mime)||typeof b.data!=='string'||b.data.length>2800000)throw Error('Invalid generated media');
   const raw=atob(b.data);if(!raw.length||raw.length>2*1024*1024)throw Error('Generated media exceeds private limit');
   const normalizedMime=mime==='audio/mp3'?'audio/mpeg':mime,extension=normalizedMime==='audio/mpeg'?'mp3':normalizedMime.split('/')[1];
   const storageId=await ctx.storage.store(new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type:normalizedMime}));
   try{result.mediaId=await ctx.runMutation(internal.privateMedia.register,{ownerKey,storageId,mime:normalizedMime,name:'gemini-'+a.mode+'.'+extension,note:models[a.mode]+'; '+a.prompt})}catch(e){await ctx.storage.delete(storageId);throw e}
   if(a.mode==='music')result.requestedDurationSeconds=30;
  }
  const serialized=JSON.stringify(result);await ctx.runMutation(internal.runtimeReceipts.finish,{jobId:admission.jobId,status:'complete',result:serialized});return serialized;
 }catch{
  const detail=providerStatus&&providerStatus>=400?'Google returned HTTP '+providerStatus+'.':'Provider response or private persistence failed.';
  await ctx.runMutation(internal.runtimeReceipts.finish,{jobId:admission.jobId,status:'failed',result:detail+' Billing may have occurred. No automatic retry.'});
  throw new ConvexError(detail+' Review the durable receipt before a new attempt.');
 }
}})
