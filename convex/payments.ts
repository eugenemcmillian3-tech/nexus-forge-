"use node"
import Stripe from 'stripe'
import { v } from 'convex/values'
import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { currentPaymentMode } from './billingModel'

function client() {
  const key=process.env.STRIPE_SECRET_KEY
  if(!key)throw new Error('Payments are not configured')
  const mode=currentPaymentMode()
  if((mode==='live')!==key.startsWith('sk_live_'))throw new Error('Payment mode and keys do not match')
  return new Stripe(key)
}
function toUnitAmount(price:number,currency:string){if(currency!=='usd')throw new Error('Unsupported currency');return Math.round(price*100)}
async function refreshSubscription(ctx:any,stripe:Stripe,id:string,mode:'test'|'live'){
 const sub=await stripe.subscriptions.retrieve(id),intentId=sub.metadata.intentId
 if(intentId)await ctx.runMutation(internal.billing.subscriptionState,{intentId:intentId as Id<'billingIntents'>,mode,customerId:String(sub.customer),subscriptionId:sub.id,status:sub.status,cancelAtPeriodEnd:sub.cancel_at_period_end||sub.cancel_at===sub.items.data[0]?.current_period_end,cancelAt:sub.cancel_at?sub.cancel_at*1000:0})
 return sub
}
async function fulfillPrepaid(ctx:any,stripe:Stripe,id:string,mode:'test'|'live',expectedPaymentIntentId?:string){
 const session=await stripe.checkout.sessions.retrieve(id)
 if(session.mode!=='payment'||!session.metadata?.intentId||session.currency!=='usd')return
 if(expectedPaymentIntentId&&session.payment_intent!==expectedPaymentIntentId)throw new Error('Payment identity does not match checkout')
 if(session.payment_status!=='paid'){
  if(expectedPaymentIntentId)throw new Error('Payment session settlement pending')
  return
 }
 const intentId=session.metadata.intentId as Id<'billingIntents'>
 const data=await ctx.runQuery(internal.billing.getIntent,{id:intentId,mode})
 if(!data||data.intent.sessionId!==session.id)throw new Error('Payment session does not match checkout')
 const pi=typeof session.payment_intent==='string'?await stripe.paymentIntents.retrieve(session.payment_intent,{expand:['latest_charge']}):null
 const charge=pi?.latest_charge
 if(charge&&typeof charge!=='string'&&charge.amount_refunded>0){await ctx.runMutation(internal.billing.freeze,{customerId:String(session.customer),mode});return}
 let invoiceUrl:string|undefined
 if(typeof session.invoice==='string'){const invoice=await stripe.invoices.retrieve(session.invoice);invoiceUrl=invoice.hosted_invoice_url??undefined}
 await ctx.runMutation(internal.billing.grant,{intentId,mode,key:session.id,paidCents:session.amount_total??0,customerId:String(session.customer),...(typeof session.payment_intent==='string'?{paymentIntentId:session.payment_intent}:{}),...(invoiceUrl?{invoiceUrl}:{})})
}
export const checkout=action({
 args:{sku:v.string(),requestKey:v.string()},returns:v.object({clientSecret:v.string()}),
 handler:async(ctx,a):Promise<{clientSecret:string}>=>{
  const stripe=client()
  await ctx.runMutation(internal.billing.seed,{})
  const data=await ctx.runMutation(internal.billing.intent,a)
  const p=data.product
  const customerId=data.customerId??(await stripe.customers.create({metadata:{ownerKey:data.ownerKey}},{idempotencyKey:'nexus-customer-'+data.mode+'-'+data.ownerKey})).id
  await ctx.runQuery(internal.billing.customerCanPay,{customerId,mode:data.mode})
  const metadata={intentId:String(data.id),sku:p.sku}
  const session=await stripe.checkout.sessions.create({
   ui_mode:'embedded_page',redirect_on_completion:'never',adaptive_pricing:{enabled:false},mode:p.recurring?'subscription':'payment',customer:customerId,allowed_payment_method_types:['card'],
   expires_at:Math.floor(data.createdAt/1000)+3600,client_reference_id:String(data.id),metadata,
   line_items:[{price_data:{currency:'usd',unit_amount:toUnitAmount(p.price,'usd'),product_data:{name:'NEXUS FORGE '+p.name},...(p.recurring?{recurring:{interval:'month' as const}}:{})},quantity:1}],
   ...(p.recurring?{subscription_data:{metadata}}:{invoice_creation:{enabled:true},payment_intent_data:{metadata}}),
  },{idempotencyKey:'nexus-checkout-'+String(data.id)})
  await ctx.runMutation(internal.billing.bindSession,{id:data.id,sessionId:session.id})
  if(!session.client_secret)throw new Error('Payment session unavailable')
  return {clientSecret:session.client_secret}
 }
})
export const portal=action({args:{},returns:v.object({url:v.string()}),handler:async(ctx):Promise<{url:string}>=>{
 const stripe=client(),data=await ctx.runQuery(internal.billing.context,{})
 if(!data.account?.customerId)throw new Error('No paid billing account yet')
 if(data.account.subscriptionId)await refreshSubscription(ctx,stripe,data.account.subscriptionId,data.mode)
 const session=await stripe.billingPortal.sessions.create({customer:data.account.customerId,return_url:'https://www.network-x-ai.com/billing'})
 return {url:session.url}
}})
export const webhook=internalAction({
 args:{payload:v.string(),signature:v.string(),mode:v.union(v.literal('test'),v.literal('live'))},returns:v.object({success:v.boolean()}),
 handler:async(ctx,a):Promise<{success:boolean}>=>{
  let event:Stripe.Event
  const stripe=client()
  try{
   event=stripe.webhooks.constructEvent(a.payload,a.signature,process.env.STRIPE_WEBHOOK_SECRET!)
   if(event.livemode!==(a.mode==='live')||a.mode!==currentPaymentMode())return {success:false}
  }catch{return {success:false}}
  // Canonical state and session-keyed grants tolerate delayed and overlapping events.
  if(event.type==='checkout.session.completed'){
   await fulfillPrepaid(ctx,stripe,event.data.object.id,a.mode)
  }else if(event.type==='payment_intent.succeeded'){
   const pi=await stripe.paymentIntents.retrieve(event.data.object.id)
   if(pi.metadata.intentId){
    const data=await ctx.runQuery(internal.billing.getIntent,{id:pi.metadata.intentId as Id<'billingIntents'>,mode:a.mode})
    if(data?.intent.sessionId)await fulfillPrepaid(ctx,stripe,data.intent.sessionId,a.mode,pi.id)
   }
  }else if(event.type==='invoice.paid'){
   const invoice=await stripe.invoices.retrieve(event.data.object.id)
   const raw=invoice.parent?.subscription_details?.subscription,id=typeof raw==='string'?raw:raw?.id
   if(id&&invoice.status==='paid'&&invoice.currency==='usd'&&['subscription_create','subscription_cycle'].includes(invoice.billing_reason??'')){
    const sub=await refreshSubscription(ctx,stripe,id,a.mode),intentId=sub.metadata.intentId,item=sub.items.data[0],periodEnd=invoice.lines.data[0]?.period.end
    if(intentId&&item&&periodEnd&&invoice.lines.data.length===1&&sub.status==='active'){
     await ctx.runMutation(internal.billing.grant,{intentId:intentId as Id<'billingIntents'>,mode:a.mode,key:invoice.id,paidCents:invoice.amount_paid,customerId:String(sub.customer),subscriptionId:sub.id,periodEnd:periodEnd*1000,...(invoice.hosted_invoice_url?{invoiceUrl:invoice.hosted_invoice_url}:{})})
    }
   }
  }else if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'||event.type==='customer.subscription.deleted'){
   await refreshSubscription(ctx,stripe,event.data.object.id,a.mode)
  }else if(event.type==='invoice.payment_failed'){
   const invoice=await stripe.invoices.retrieve(event.data.object.id),raw=invoice.parent?.subscription_details?.subscription,id=typeof raw==='string'?raw:raw?.id
   if(id)await refreshSubscription(ctx,stripe,id,a.mode)
  }else if(event.type==='charge.refunded'){
   const charge=await stripe.charges.retrieve(event.data.object.id)
   if(charge.customer&&charge.amount_refunded>0)await ctx.runMutation(internal.billing.freeze,{customerId:typeof charge.customer==='string'?charge.customer:charge.customer.id,mode:a.mode})
  }
  return {success:true}
 }
})
