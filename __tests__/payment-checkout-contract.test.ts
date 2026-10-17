import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api,internal } from '../convex/_generated/api'
const mock=vi.hoisted(()=>({create:vi.fn(),session:{} as any,pi:{} as any}))
vi.mock('stripe',()=>({default:class{
 customers={create:async()=>({id:'customer-contract'})}
 checkout={sessions:{create:mock.create,retrieve:async()=>mock.session}}
 paymentIntents={retrieve:async()=>mock.pi}
 webhooks={constructEvent:(payload:string)=>JSON.parse(payload)}
}}))
const modules=import.meta.glob('../convex/**/*.ts')
beforeEach(()=>{
 vi.stubEnv('VITE_STRIPE_MODE','test');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_fixture');vi.stubEnv('STRIPE_WEBHOOK_SECRET','whsec_fixture')
 mock.create.mockReset().mockImplementation(async(a:any)=>{
  mock.pi={id:'pi_contract',metadata:a.payment_intent_data?.metadata??{},latest_charge:{amount_refunded:0}}
  mock.session={id:'cs_contract',client_secret:'fixture_client_secret',mode:a.mode,metadata:a.metadata,currency:'usd',payment_status:'unpaid',payment_intent:mock.pi.id,customer:'customer-contract',amount_total:a.line_items[0].price_data.unit_amount}
  return mock.session
 })
})
afterEach(()=>vi.unstubAllEnvs())
async function fixture(sku='credit-10'){
 const t=convexTest(schema,modules),owner=t.withIdentity({subject:'contract-owner'})
 await owner.action(api.payments.checkout,{sku,requestKey:'checkout_contract_12345678'})
 return {t,owner}
}
const event=(type:string,id:string)=>({payload:JSON.stringify({id:'evt_fixture',livemode:false,type,data:{object:{id}}}),signature:'verified-in-sdk-fixture',mode:'test' as const})
describe('checkout and verified-event dispatch contracts',()=>{
 it('does not create checkout for a customer whose refund preceded account creation',async()=>{
  const t=convexTest(schema,modules),owner=t.withIdentity({subject:'contract-owner'})
  await t.mutation(internal.billing.freeze,{customerId:'customer-contract',mode:'test'})
  await expect(owner.action(api.payments.checkout,{sku:'credit-10',requestKey:'blocked_checkout_123456789'})).rejects.toThrow(/Refund review/)
  expect(mock.create).not.toHaveBeenCalled()
 })
 it.each([['credit-10','payment',1000],['core','subscription',4900]])('uses USD embedded checkout for %s',async(sku,mode,amount)=>{
  const {owner}=await fixture(String(sku)),params=mock.create.mock.calls[0][0]
  expect(params).toMatchObject({ui_mode:'embedded_page',redirect_on_completion:'never',adaptive_pricing:{enabled:false},mode,allowed_payment_method_types:['card']})
  expect(params.line_items[0]).toMatchObject({quantity:1,price_data:{currency:'usd',unit_amount:amount}})
  if(mode==='subscription'){expect(params.line_items[0].price_data.recurring).toEqual({interval:'month'});expect(params).not.toHaveProperty('invoice_creation')}
  else expect(params.invoice_creation).toEqual({enabled:true})
  expect((await owner.query(api.billing.mine,{})).account).toBeNull()
 })
 it('fulfills a delayed prepaid payment once across payment and checkout notifications',async()=>{
  const {t,owner}=await fixture()
  await t.action(internal.payments.webhook,event('checkout.session.completed','cs_contract'))
  expect((await owner.query(api.billing.mine,{})).account).toBeNull()
  mock.session.payment_status='paid'
  await t.action(internal.payments.webhook,event('payment_intent.succeeded','pi_contract'))
  await t.action(internal.payments.webhook,event('checkout.session.completed','cs_contract'))
  await t.action(internal.payments.webhook,event('payment_intent.succeeded','pi_contract'))
  const mine=await owner.query(api.billing.mine,{})
  expect(mine.account?.prepaid).toBe(1000);expect(mine.receipts).toHaveLength(1)
 })
 it('requests a webhook retry if the paid payment arrives before the session shows settlement',async()=>{
  const {t,owner}=await fixture()
  const args=event('payment_intent.succeeded','pi_contract'),request=()=>t.fetch('/stripe/webhook',{method:'POST',headers:{'stripe-signature':args.signature,'x-stripe-mode':'test'},body:args.payload})
  expect((await request()).status).toBe(500)
  expect((await owner.query(api.billing.mine,{})).account).toBeNull()
  mock.session.payment_status='paid'
  expect((await request()).status).toBe(200)
  expect((await owner.query(api.billing.mine,{})).receipts).toHaveLength(1)
 })
})
