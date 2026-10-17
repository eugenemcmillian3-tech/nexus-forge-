import { v } from 'convex/values'
import { internalMutation, internalQuery, query } from './_generated/server'
import { requireOperator } from './permissions'
import { currentPaymentMode, offers, paymentMode } from './billingModel'

export const seed = internalMutation({ args: {}, returns: v.null(), handler: async ctx => {
  for (const offer of offers) {
    const old = await ctx.db.query('billingProducts').withIndex('by_sku', q => q.eq('sku',offer.sku)).unique()
    if (!old) await ctx.db.insert('billingProducts', { ...offer, active: true })
  } return null
}})
export const catalog = query({ args: {}, returns: v.any(), handler: async ctx => {
  const rows = await ctx.db.query('billingProducts').take(20)
  return { products: rows.length?rows.filter(p=>p.active):offers.map(p=>({...p,active:true})), mode: process.env.VITE_STRIPE_MODE ?? 'unconfigured' }
}})
export async function accountFor(ctx: any, ownerKey: string, mode: 'test'|'live') {
  return await ctx.db.query('billingAccounts').withIndex('by_owner_mode',(q:any)=>q.eq('ownerKey',ownerKey).eq('mode',mode)).unique()
}
export const mine = query({ args: {}, returns: v.any(), handler: async ctx => {
  const ownerKey = await requireOperator(ctx)
  const configured=process.env.VITE_STRIPE_MODE
  if(configured!=='test'&&configured!=='live')return {mode:'unconfigured',account:null,receipts:[],usage:[]}
  const mode = currentPaymentMode(), account = await accountFor(ctx,ownerKey,mode)
  const receipts = await ctx.db.query('billingReceipts').withIndex('by_owner_mode',q=>q.eq('ownerKey',ownerKey).eq('mode',mode)).order('desc').take(20)
  const usage = await ctx.db.query('billingHolds').withIndex('by_owner_mode',q=>q.eq('ownerKey',ownerKey).eq('mode',mode)).order('desc').take(20)
  return { mode, usage, account: account ? { prepaid: account.prepaid, included: account.expiresAt>Date.now()?account.included:0, held:account.held, unresolved:account.unresolved, frozen:account.frozen, plan:account.plan, subscriptionStatus:account.subscriptionStatus, cancelAtPeriodEnd:account.cancelAtPeriodEnd??false, cancelAt:account.cancelAt, expiresAt:account.expiresAt } : null, receipts }
}})
export const context = internalQuery({ args:{}, returns:v.any(), handler:async ctx=>{
  const ownerKey=await requireOperator(ctx),mode=currentPaymentMode()
  return {ownerKey,mode,account:await accountFor(ctx,ownerKey,mode)}
}})
export const intent = internalMutation({args:{sku:v.string(),requestKey:v.string()},returns:v.any(),handler:async(ctx,a)=>{
  const ownerKey=await requireOperator(ctx),mode=currentPaymentMode()
  if(!/^[a-zA-Z0-9_-]{16,100}$/.test(a.requestKey))throw new Error('Invalid checkout identity')
  const product=await ctx.db.query('billingProducts').withIndex('by_sku',q=>q.eq('sku',a.sku)).unique()
  if(!product?.active)throw new Error('Product unavailable')
  const account=await accountFor(ctx,ownerKey,mode)
  if(account?.frozen)throw new Error('Billing account requires review')
  if(product.recurring&&account?.subscriptionId&&['active','past_due','unpaid','incomplete'].includes(account.subscriptionStatus??'')&&account.expiresAt>Date.now())throw new Error('Manage the existing subscription before starting another')
  const open=product.recurring?await ctx.db.query('billingIntents').withIndex('by_owner_mode_recurring',q=>q.eq('ownerKey',ownerKey).eq('mode',mode).eq('recurring',true)).order('desc').first():null
  if(open&&Date.now()-open.createdAt<3600000){
    if(open.sku!==a.sku)throw new Error('An existing subscription checkout is still open. Complete it or wait for it to expire before choosing a different plan.')
    return {id:open._id,ownerKey,mode,product,createdAt:open.createdAt,customerId:account?.customerId}
  }
  const previous=await ctx.db.query('billingIntents').withIndex('by_owner_key_mode',q=>q.eq('ownerKey',ownerKey).eq('requestKey',a.requestKey).eq('mode',mode)).unique()
  if(previous&&previous.sku!==a.sku)throw new Error('Checkout identity cannot change product')
  const id=previous?previous._id:await ctx.db.insert('billingIntents',{ownerKey,mode,sku:a.sku,recurring:product.recurring,requestKey:a.requestKey,createdAt:Date.now()})
  return {id,ownerKey,mode,product,createdAt:previous?.createdAt??Date.now(),customerId:account?.customerId}
}})
export const bindSession = internalMutation({args:{id:v.id('billingIntents'),sessionId:v.string()},returns:v.null(),handler:async(ctx,a)=>{
  const row=await ctx.db.get(a.id);if(!row)throw new Error('Checkout not found')
  if(row.sessionId&&row.sessionId!==a.sessionId)throw new Error('Conflicting checkout session')
  await ctx.db.patch(a.id,{sessionId:a.sessionId});return null
}})
export const customerCanPay = internalQuery({args:{customerId:v.string(),mode:paymentMode},returns:v.null(),handler:async(ctx,a)=>{
 const block=await ctx.db.query('billingRefundBlocks').withIndex('by_customer_mode',q=>q.eq('customerId',a.customerId).eq('mode',a.mode)).unique()
 if(block)throw new Error('Refund review is required before another purchase')
 return null
}})
export const getIntent = internalQuery({args:{id:v.id('billingIntents'),mode:paymentMode},returns:v.any(),handler:async(ctx,a)=>{
  const intent=await ctx.db.get(a.id);if(!intent||intent.mode!==a.mode)return null
  const product=await ctx.db.query('billingProducts').withIndex('by_sku',q=>q.eq('sku',intent.sku)).unique()
  return {intent,product}
}})
export const grant = internalMutation({args:{intentId:v.id('billingIntents'),mode:paymentMode,key:v.string(),paidCents:v.number(),customerId:v.string(),subscriptionId:v.optional(v.string()),periodEnd:v.optional(v.number()),invoiceUrl:v.optional(v.string()),paymentIntentId:v.optional(v.string())},returns:v.null(),handler:async(ctx,a)=>{
  const intent=await ctx.db.get(a.intentId);if(!intent||intent.mode!==a.mode)throw new Error('Checkout ownership missing')
  const product=await ctx.db.query('billingProducts').withIndex('by_sku',q=>q.eq('sku',intent.sku)).unique()
  if(!product||a.paidCents!==Math.round(product.price*100)||!!a.subscriptionId!==product.recurring)throw new Error('Payment does not match catalog')
  if(product.recurring&&(!a.periodEnd||!Number.isFinite(a.periodEnd)))throw new Error('Paid subscription period missing')
  const prior=await ctx.db.query('billingReceipts').withIndex('by_key_mode',q=>q.eq('key',a.key).eq('mode',a.mode)).unique()
  if(prior){if(prior.ownerKey!==intent.ownerKey||prior.paidCents!==a.paidCents||prior.sku!==intent.sku)throw new Error('Conflicting payment');return null}
  const refundBlock=await ctx.db.query('billingRefundBlocks').withIndex('by_customer_mode',q=>q.eq('customerId',a.customerId).eq('mode',a.mode)).unique()
  if(refundBlock)throw new Error('Billing requires refund review')
  const old=await accountFor(ctx,intent.ownerKey,a.mode)
  if(old?.customerId&&old.customerId!==a.customerId)throw new Error('Payment customer mismatch')
  if(old?.frozen)throw new Error('Billing requires review')
  const base={ownerKey:intent.ownerKey,mode:a.mode,prepaid:0,included:0,expiresAt:0,held:0,unresolved:0,frozen:false,...old,customerId:a.customerId}
  const patch=product.recurring
    ? (a.periodEnd!>base.expiresAt?{included:Math.round(product.credit*100),expiresAt:a.periodEnd!,subscriptionId:a.subscriptionId,plan:product.sku,subscriptionStatus:'active'}:{})
    : {prepaid:base.prepaid+Math.round(product.credit*100)}
  if(old)await ctx.db.patch(old._id,{...patch,customerId:a.customerId})
  else {const {_id,_creationTime,...fields}=base;await ctx.db.insert('billingAccounts',{...fields,...patch})}
  await ctx.db.insert('billingReceipts',{ownerKey:intent.ownerKey,mode:a.mode,key:a.key,sku:intent.sku,paidCents:a.paidCents,creditCents:Math.round(product.credit*100),createdAt:Date.now(),...(a.invoiceUrl?{invoiceUrl:a.invoiceUrl}:{}),...(a.paymentIntentId?{paymentIntentId:a.paymentIntentId}:{})})
  return null
}})
export const subscriptionState = internalMutation({args:{intentId:v.id('billingIntents'),mode:paymentMode,customerId:v.string(),subscriptionId:v.string(),status:v.string(),cancelAtPeriodEnd:v.optional(v.boolean()),cancelAt:v.optional(v.number())},returns:v.null(),handler:async(ctx,a)=>{
 const intent=await ctx.db.get(a.intentId);if(!intent||intent.mode!==a.mode)return null
 const account=await accountFor(ctx,intent.ownerKey,a.mode)
 if(account?.subscriptionId===a.subscriptionId&&account.customerId===a.customerId){
   await ctx.db.patch(account._id,{subscriptionStatus:a.status,...(a.cancelAtPeriodEnd!==undefined?{cancelAtPeriodEnd:a.cancelAtPeriodEnd}:{}),...(a.cancelAt!==undefined?{cancelAt:a.cancelAt}:{}),...(['canceled','unpaid','past_due','incomplete_expired'].includes(a.status)?{included:0}:{})})
 }return null
}})
export const freeze = internalMutation({args:{customerId:v.string(),mode:paymentMode},returns:v.null(),handler:async(ctx,a)=>{
 const block=await ctx.db.query('billingRefundBlocks').withIndex('by_customer_mode',q=>q.eq('customerId',a.customerId).eq('mode',a.mode)).unique()
 if(!block)await ctx.db.insert('billingRefundBlocks',{customerId:a.customerId,mode:a.mode,createdAt:Date.now()})
 const rows=await ctx.db.query('billingAccounts').withIndex('by_customer_mode',q=>q.eq('customerId',a.customerId).eq('mode',a.mode)).take(10)
 for(const row of rows)await ctx.db.patch(row._id,{frozen:true})
 return null
}})
