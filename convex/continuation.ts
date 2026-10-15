import { v, ConvexError } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { continuationPreflight } from './continuationPolicy'
const identity={claimId:v.id('executionClaims'),missionId:v.id('missions'),runId:v.id('missionRuns')}
export const take=internalMutation({args:identity,returns:v.boolean(),handler:async(ctx,a)=>{
 const claim=await ctx.db.get(a.claimId);if(!claim||claim.status!=='running'||claim.scope!=='council'||claim.missionId!==a.missionId||claim.workKey!=='runner:'+a.runId)throw new ConvexError('Continuation claim is not active')
 const ticket=await ctx.db.query('executionEffects').withIndex('by_claimId_and_effectKey',q=>q.eq('claimId',a.claimId).eq('effectKey','continuation-ticket:v1')).unique();if(!ticket)throw new ConvexError('Continuation authorization is missing')
 const state=JSON.parse(ticket.payload);if(state.status!=='ready')return false
 const block=await continuationPreflight(ctx,claim);if(block){await ctx.db.patch(claim._id,{status:'uncertain'});await ctx.db.patch(ticket._id,{payload:JSON.stringify({...state,status:'blocked',reason:block})});return false}
 await ctx.db.patch(ticket._id,{payload:JSON.stringify({...state,status:'consumed',consumedAt:Date.now()})});return true
}})
export const inputs=internalQuery({args:{claimId:v.id('executionClaims')},handler:async(ctx,{claimId})=>{
 const claim=await ctx.db.get(claimId);if(!claim||claim.scope!=='council'||claim.status!=='running')throw new ConvexError('Continuation claim is not active')
 const snapshot=await ctx.db.query('executionEffects').withIndex('by_claimId_and_effectKey',q=>q.eq('claimId',claimId).eq('effectKey','council-context:v1')).unique();if(!snapshot)throw new ConvexError('Saved context is missing')
 const saved=JSON.parse(snapshot.payload),mission=await ctx.db.get(claim.missionId);if(!mission?.approved||mission.mission!==saved.context?.missionText)throw new ConvexError('Saved mission context changed')
 const receiptId=ctx.db.normalizeId('councilMemoryReceipts',saved.memoryReceiptId);if(!receiptId)throw new ConvexError('Saved memory receipt is invalid')
 return{...saved.context,memoryReceiptId:receiptId}
}})
export const replayLookup=internalQuery({args:{claimId:v.id('executionClaims'),stage:v.string(),role:v.string(),requestDigest:v.string()},returns:v.union(v.string(),v.null()),handler:async(ctx,a)=>{
 const claim=await ctx.db.get(a.claimId);if(!claim||claim.scope!=='council'||claim.status!=='running')throw new ConvexError('Continuation claim is not active')
 const runId=ctx.db.normalizeId('missionRuns',claim.workKey.slice(7));if(!runId)throw new ConvexError('Missing continuation runner')
 const rows=await ctx.db.query('providerInvocations').withIndex('by_missionRunId_and_stage_and_role_and_outcome',q=>q.eq('missionRunId',runId).eq('stage',a.stage)).take(2)
 if(!rows.length)return null
 const mission=await ctx.db.get(claim.missionId),row=rows[0],result=await ctx.db.query('providerResults').withIndex('by_invocation',q=>q.eq('invocationId',row._id)).unique()
 if(rows.length!==1||row.missionId!==claim.missionId||row.ownerKey!==mission?.ownerKey||row.role!==a.role||row.outcome!=='succeeded'||!result||result.requestDigest!==a.requestDigest)throw new ConvexError('Saved provider request no longer matches the current Council contract')
 return result.answer
}})
