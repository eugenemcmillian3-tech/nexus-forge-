import { defineTable } from 'convex/server'
import { v } from 'convex/values'
export const paymentMode = v.union(v.literal('test'), v.literal('live'))
export const offers = [
  { sku: 'core', name: 'Core', price: 49, credit: 10, recurring: true },
  { sku: 'pro', name: 'Pro', price: 149, credit: 35, recurring: true },
  { sku: 'business', name: 'Business', price: 399, credit: 100, recurring: true },
  ...[10,25,50,100].map(price => ({ sku: 'credit-'+price, name: '$'+price+' prepaid usage', price, credit: price, recurring: false })),
]
export function currentPaymentMode(): 'test' | 'live' {
  const mode = process.env.VITE_STRIPE_MODE
  if (mode !== 'test' && mode !== 'live') throw new Error('Payments are not configured')
  return mode
}
export const billingTables = {
  billingProducts: defineTable({ sku: v.string(), name: v.string(), price: v.number(), credit: v.number(), recurring: v.boolean(), active: v.boolean() }).index('by_sku', ['sku']),
  billingAccounts: defineTable({ ownerKey: v.string(), mode: paymentMode, prepaid: v.number(), included: v.number(), expiresAt: v.number(), held: v.number(), unresolved: v.number(), customerId: v.optional(v.string()), subscriptionId: v.optional(v.string()), plan: v.optional(v.string()), subscriptionStatus: v.optional(v.string()), frozen: v.boolean(), healthAt: v.optional(v.number()), healthDay: v.optional(v.number()), healthCount: v.optional(v.number()) }).index('by_owner_mode', ['ownerKey','mode']).index('by_customer_mode', ['customerId','mode']),
  billingIntents: defineTable({ ownerKey: v.string(), mode: paymentMode, sku: v.string(), recurring: v.optional(v.boolean()), requestKey: v.string(), createdAt: v.number(), sessionId: v.optional(v.string()), customerId: v.optional(v.string()) }).index('by_owner_key_mode', ['ownerKey','requestKey','mode']).index('by_owner_mode_recurring', ['ownerKey','mode','recurring']),
  billingReceipts: defineTable({ ownerKey: v.string(), mode: paymentMode, key: v.string(), sku: v.string(), paidCents: v.number(), creditCents: v.number(), createdAt: v.number(), invoiceUrl: v.optional(v.string()), paymentIntentId: v.optional(v.string()) }).index('by_key_mode', ['key','mode']).index('by_owner_mode', ['ownerKey','mode']).index('by_payment_mode', ['paymentIntentId','mode']),
  billingHolds: defineTable({ ownerKey: v.string(), mode: paymentMode, invocationId: v.id('providerInvocations'), reserved: v.number(), includedReserved: v.number(), prepaidReserved: v.number(), includedExpires: v.number(), status: v.union(v.literal('held'),v.literal('settled'),v.literal('review')), charged: v.optional(v.number()), reviewEvidence: v.optional(v.string()), rateVersion: v.optional(v.string()), costBasis: v.optional(v.string()), providerCostUsd: v.optional(v.number()), createdAt: v.number() }).index('by_invocation_mode', ['invocationId','mode']).index('by_owner_mode', ['ownerKey','mode']),
}
