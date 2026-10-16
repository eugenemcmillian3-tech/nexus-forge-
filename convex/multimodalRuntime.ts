// Retired compatibility endpoints: no provider requests or storage writes.
import {v,ConvexError} from 'convex/values'
import {action} from './_generated/server'
import {requireOperator} from './permissions'
const mode=v.union(v.literal('generate'),v.literal('describe'),v.literal('transcribe'),v.literal('video-frames'))
export const run=action({args:{requestKey:v.string(),mode,prompt:v.string(),mediaIds:v.array(v.id('privateMedia')),timestamps:v.array(v.number())},handler:async(ctx):Promise<string>=>{await requireOperator(ctx);throw new ConvexError('Multimodal Studio has been removed. Media generation is disabled.')}})
