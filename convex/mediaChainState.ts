import {v,ConvexError} from 'convex/values'
import {internalMutation,internalQuery,query} from './_generated/server'
import {requireOperator} from './permissions'
import {audit,policy} from './frontierSupport'
import {mediaProviderConfig} from './mediaChainConfig'
export const readiness=query({args:{},handler:async ctx=>{await requireOperator(ctx);const e=mediaProviderConfig(process.env);return{cloudflare:!!(e.account&&e.cloudflare),huggingface:!!e.hf,pollinations:!!e.pollinations,musicNotice:'MusicGen weights are non-commercial and its HF hosted availability is not guaranteed. No generated music is assumed.',freeNotice:'Provider quotas or charges can apply. No free balance or billing plan is assumed.'}}})
export const begin=internalMutation({args:{ownerKey:v.string(),requestKey:v.string(),input:v.string(),key:v.string()},handler:async(ctx,a)=>{
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(a.requestKey)||a.input.length>20000||!/^[a-f0-9]{64}$/.test(a.key))throw new ConvexError('Invalid media request')
 const existing=await ctx.db.query('runtimeJobs').withIndex('by_owner_key',q=>q.eq('ownerKey',a.ownerKey).eq('requestKey',a.requestKey)).unique()
 if(existing){if(existing.kind!=='media-chain'||existing.input!==a.input)throw new ConvexError('Request key conflicts with immutable input');if(existing.status==='complete')return{state:'complete' as const,result:existing.result!,jobId:existing._id};if(existing.status==='pending')return{state:'pending' as const,jobId:existing._id};throw new ConvexError('Request already failed; review its receipt')}
 const row=await ctx.db.query('mediaChainEntries').withIndex('by_owner_key',q=>q.eq('ownerKey',a.ownerKey).eq('key',a.key)).unique()
 if(row?.status==='pending')return{state:'pending' as const,jobId:row.jobId}
 if(row?.status==='failed')throw new ConvexError('Prior media attempt is uncertain; reconcile its receipt before retrying')
 const p=await policy(ctx,a.ownerKey)
 if((await ctx.db.query('runtimeJobs').withIndex('by_owner',q=>q.eq('ownerKey',a.ownerKey)).take(p.maxRecords)).length>=p.maxRecords)throw new ConvexError('Runtime receipt quota reached')
 if(!row&&(await ctx.db.query('mediaChainEntries').withIndex('by_owner',q=>q.eq('ownerKey',a.ownerKey)).take(p.maxRecords)).length>=p.maxRecords)throw new ConvexError('Media cache quota reached')
 const cached=row?.status==='complete'&&row.cacheUntil>Date.now()&&row.result?JSON.stringify({...JSON.parse(row.result),cached:true}):null
 const jobId=await ctx.db.insert('runtimeJobs',{ownerKey:a.ownerKey,requestKey:a.requestKey,kind:'media-chain',input:a.input,status:cached?'complete':'pending',...(cached?{result:cached}:{}),createdAt:Date.now()})
 await audit(ctx,a.ownerKey,'media-chain',cached?'cache-hit':'request-admitted',String(jobId))
 if(cached)return{state:'complete' as const,result:cached,jobId}
 const data={jobId,status:'pending' as const,cacheUntil:0,updatedAt:Date.now(),result:undefined}
 if(row)await ctx.db.patch(row._id,data);else await ctx.db.insert('mediaChainEntries',{ownerKey:a.ownerKey,key:a.key,...data})
 return{state:'admitted' as const,jobId}
}})
export const cooldown=internalQuery({args:{ownerKey:v.string(),provider:v.string()},handler:async(ctx,a)=>(await ctx.db.query('mediaChainCooldowns').withIndex('by_owner_provider',q=>q.eq('ownerKey',a.ownerKey).eq('provider',a.provider)).unique())?.until??0})
export const cool=internalMutation({args:{ownerKey:v.string(),provider:v.string(),until:v.number()},handler:async(ctx,a)=>{if(!['cloudflare-flux','huggingface-flux','pollinations','huggingface-musicgen'].includes(a.provider)||!Number.isFinite(a.until))throw new ConvexError('Invalid provider cooldown');const row=await ctx.db.query('mediaChainCooldowns').withIndex('by_owner_provider',q=>q.eq('ownerKey',a.ownerKey).eq('provider',a.provider)).unique(),until=Math.max(Date.now(),Math.min(a.until,Date.now()+86400000),row?.until??0);if(row)await ctx.db.patch(row._id,{until});else await ctx.db.insert('mediaChainCooldowns',{...a,until})}})
export const settle=internalMutation({args:{ownerKey:v.string(),key:v.string(),jobId:v.id('runtimeJobs'),result:v.string(),success:v.boolean(),cacheable:v.boolean()},handler:async(ctx,a)=>{
 const row=await ctx.db.query('mediaChainEntries').withIndex('by_owner_key',q=>q.eq('ownerKey',a.ownerKey).eq('key',a.key)).unique(),job=await ctx.db.get(a.jobId)
 if(!row||row.jobId!==a.jobId||row.status!=='pending'||job?.ownerKey!==a.ownerKey||job.status!=='pending'||a.result.length>16000)throw new ConvexError('Invalid media settlement')
 await ctx.db.patch(row._id,{status:a.success?'complete':'failed',result:a.result,cacheUntil:a.success&&a.cacheable?Date.now()+86400000:0,updatedAt:Date.now()})
 await ctx.db.patch(a.jobId,{status:a.success?'complete':'failed',result:a.result})
 await audit(ctx,a.ownerKey,'media-chain',a.success?(a.cacheable?'generated-media':'placeholder-produced'):'request-failed',String(a.jobId))
}})
