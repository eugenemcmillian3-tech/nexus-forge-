import { internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { accountFor } from './billing'
export const resolveHold=internalMutation({args:{id:v.id('billingHolds'),chargedCents:v.number(),evidence:v.string()},returns:v.null(),handler:async(ctx,a)=>{
 const hold=await ctx.db.get(a.id)
 if(!hold||hold.status!=='review'||!Number.isSafeInteger(a.chargedCents)||a.chargedCents<0||a.chargedCents>hold.reserved||a.evidence.trim().length<20||a.evidence.length>2000)throw new Error('A pending billing review, bounded charge and source evidence are required')
 const account=await accountFor(ctx,hold.ownerKey,hold.mode);if(!account)throw new Error('Account not found')
 const includedCharge=Math.min(a.chargedCents,hold.includedReserved),prepaidCharge=a.chargedCents-includedCharge
 const returnedIncluded=account.expiresAt===hold.includedExpires&&account.expiresAt>Date.now()?hold.includedReserved-includedCharge:0
 await ctx.db.patch(account._id,{included:account.included+returnedIncluded,prepaid:account.prepaid+hold.prepaidReserved-prepaidCharge,held:account.held-hold.reserved,unresolved:Math.max(0,account.unresolved-1)})
 await ctx.db.patch(hold._id,{status:'settled',charged:a.chargedCents,reviewEvidence:a.evidence.trim()})
 return null
}})
export const reversePlatformError=internalMutation({args:{id:v.id('billingHolds'),evidence:v.string()},returns:v.null(),handler:async(ctx,a)=>{
 const hold=await ctx.db.get(a.id)
 if(!hold||hold.status!=='settled'||a.evidence.trim().length<20||a.evidence.length>2000)throw new Error('Settled charge and platform-error evidence required')
 if(!hold.charged)return null
 const account=await accountFor(ctx,hold.ownerKey,hold.mode);if(!account)throw new Error('Account not found')
 await ctx.db.patch(account._id,{prepaid:account.prepaid+hold.charged})
 await ctx.db.patch(hold._id,{charged:0,reviewEvidence:'Platform-error credit reversal: '+a.evidence.trim()})
 return null
}})
