import {v,ConvexError} from 'convex/values'
import {query,internalMutation,action,internalQuery} from './_generated/server'
import {internal} from './_generated/api'
import {requireOperator} from './permissions'
import type {Id} from './_generated/dataModel'
// Historical private files remain owner-readable. New studio writes are retired.
export const register=internalMutation({args:{ownerKey:v.string(),mime:v.string(),storageId:v.id('_storage'),name:v.string(),note:v.string()},handler:async():Promise<Id<'privateMedia'>>=>{throw new ConvexError('Multimodal Studio has been removed. Media registration is disabled.')}})
export const list = query({args:{},handler:async(ctx)=>{const ownerKey=await requireOperator(ctx);return ctx.db.query('privateMedia').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).order('desc').take(100)}})
export const owned = internalQuery({args:{mediaId:v.id('privateMedia')},handler:async(ctx,{mediaId})=>{const ownerKey=await requireOperator(ctx),m=await ctx.db.get(mediaId);if(!m||m.ownerKey!==ownerKey)throw new ConvexError('Media not found or access denied');return m}})
export const download = action({args:{mediaId:v.id('privateMedia')},handler:async(ctx,{mediaId}):Promise<{name:string,mime:string,base64:string}>=>{const m=await ctx.runQuery(internal.privateMedia.owned,{mediaId}),blob=await ctx.storage.get(m.storageId);if(!blob||blob.size>2*1024*1024)throw new ConvexError('Media unavailable');const bytes=new Uint8Array(await blob.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));return{name:m.name,mime:m.mime,base64:btoa(raw)}}})

export const upload=action({args:{name:v.string(),note:v.string(),mime:v.string(),base64:v.string()},handler:async(ctx):Promise<string>=>{await requireOperator(ctx);throw new ConvexError('Multimodal Studio has been removed. Media upload is disabled.')}})
