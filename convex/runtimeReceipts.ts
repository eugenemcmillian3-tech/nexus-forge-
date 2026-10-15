import { v,ConvexError } from 'convex/values'
import { internalMutation,query } from './_generated/server'
import { requireOperator } from './permissions'
import { audit,policy } from './frontierSupport'
export const admit=internalMutation({args:{ownerKey:v.string(),requestKey:v.string(),kind:v.string(),input:v.string()},handler:async(ctx,a)=>{
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(a.requestKey)||a.input.length>20000)throw new ConvexError('Invalid request key or input size');
 const old=await ctx.db.query('runtimeJobs').withIndex('by_owner_key',q=>q.eq('ownerKey',a.ownerKey).eq('requestKey',a.requestKey)).unique();
 if(old){if(old.kind!==a.kind||old.input!==a.input)throw new ConvexError('Request key conflicts with immutable input');if(old.status!=='complete')throw new ConvexError('Request already attempted; review its receipt before using a new key');return{jobId:old._id,cached:old.result!}}
 const p=await policy(ctx,a.ownerKey);if((await ctx.db.query('runtimeJobs').withIndex('by_owner',q=>q.eq('ownerKey',a.ownerKey)).take(p.maxRecords)).length>=p.maxRecords)throw new ConvexError('Runtime receipt quota reached');
 const jobId=await ctx.db.insert('runtimeJobs',{...a,status:'pending',createdAt:Date.now()});await audit(ctx,a.ownerKey,a.kind,'request-admitted',String(jobId));return{jobId,cached:null}
}})
export const finish=internalMutation({args:{jobId:v.id('runtimeJobs'),status:v.union(v.literal('complete'),v.literal('failed')),result:v.string()},handler:async(ctx,a)=>{const job=await ctx.db.get(a.jobId);if(!job||job.status!=='pending'||a.result.length>60000)throw new ConvexError('Invalid runtime settlement');await ctx.db.patch(a.jobId,{status:a.status,result:a.result});await audit(ctx,job.ownerKey,job.kind,'request-'+a.status,String(a.jobId))}})
export const list=query({args:{},handler:async ctx=>{const ownerKey=await requireOperator(ctx);return ctx.db.query('runtimeJobs').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).order('desc').take(50)}})
