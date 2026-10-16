import type {QueryCtx,MutationCtx} from './_generated/server'
export const retiredRuntimeKinds=['multimodal','gemini-media','media-chain'] as const
export function isRetiredRuntimeKind(kind:string){return retiredRuntimeKinds.some(retired=>retired===kind)}
export function activeRuntimeQuery(ctx:QueryCtx|MutationCtx,ownerKey:string){
 return ctx.db.query('runtimeJobs').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).filter(q=>q.and(...retiredRuntimeKinds.map(kind=>q.neq(q.field('kind'),kind))))
}
