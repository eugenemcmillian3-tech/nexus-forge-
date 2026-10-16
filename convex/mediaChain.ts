// Retired compatibility endpoints: no provider requests or storage writes.
import {v,ConvexError} from 'convex/values'
import {action} from './_generated/server'
import {requireOperator} from './permissions'
export const run=action({args:{requestKey:v.string(),kind:v.union(v.literal('image'),v.literal('music')),prompt:v.string(),width:v.optional(v.number()),height:v.optional(v.number()),durationSec:v.optional(v.number()),timeoutMs:v.optional(v.number()),researchMusic:v.optional(v.boolean())},handler:async(ctx):Promise<string>=>{await requireOperator(ctx);throw new ConvexError('Multimodal Studio has been removed. Media generation is disabled.')}})
