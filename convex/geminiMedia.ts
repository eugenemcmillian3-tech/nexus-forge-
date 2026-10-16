// Retired compatibility endpoints: no provider requests or storage writes.
import {v,ConvexError} from 'convex/values'
import {action,query} from './_generated/server'
import {requireOperator} from './permissions'
const mode=v.union(v.literal('image'),v.literal('music'),v.literal('video'))
export const readiness=query({args:{},handler:async ctx=>{await requireOperator(ctx);return{configured:false,models:{image:'retired',music:'retired',video:'retired'},maxBytes:2097152,musicSeconds:30}}})
export const run=action({args:{requestKey:v.string(),mode,prompt:v.string(),mediaId:v.optional(v.id('privateMedia'))},handler:async(ctx):Promise<string>=>{await requireOperator(ctx);throw new ConvexError('Multimodal Studio has been removed. Media generation is disabled.')}})
