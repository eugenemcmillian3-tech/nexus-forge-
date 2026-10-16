import {query} from './_generated/server'
import {requireOperator} from './permissions'
import {policy} from './frontierSupport'
import {activeRuntimeQuery} from './runtimeCapacity'

function capacity(id:string,label:string,rows:unknown[],limit:number,scope:string){
 const complete=rows.length<=limit,count=rows.length
 return{id,label,count,complete,limit,remaining:Math.max(0,limit-count),blocked:count>=limit,scope}
}
export const overview=query({args:{},handler:async ctx=>{
 const ownerKey=await requireOperator(ctx),p=await policy(ctx,ownerKey),limit=p.maxRecords
 const [comparison,science,generality,packages,adapters,runtime,benchmarks,feeds,sources]=await Promise.all([
  ...(['comparison','science','generality'] as const).map(kind=>ctx.db.query('labProtocols').withIndex('by_owner_kind',q=>q.eq('ownerKey',ownerKey).eq('kind',kind)).take(limit+1)),
  ctx.db.query('extensionPackages').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).take(limit+1),
  ctx.db.query('externalAdapters').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).take(limit+1),
  activeRuntimeQuery(ctx,ownerKey).take(limit+1),
  ctx.db.query('benchmarkRuns').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).take(limit+1),
  ctx.db.query('outcomeFeeds').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).take(21),
  ctx.db.query('productSources').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).take(21)
 ])
 return{rows:[
  capacity('comparison','Comparison protocols',comparison,limit,'Open and closed protocols both count.'),
  capacity('science','Scientific protocols',science,limit,'Open and closed protocols both count.'),
  capacity('generality','Generality protocols',generality,limit,'Open and closed protocols both count.'),
  capacity('packages','Integration packages',packages,limit,'Every saved version counts, including retired versions.'),
  capacity('adapters','External GET adapters',adapters,limit,'Enabled and disabled adapters both count.'),
  capacity('runtime','Active runtime receipts',runtime,limit,'Pending, complete and failed non-media receipts count. Retired media history is excluded.'),
  capacity('benchmarks','Evaluation reports',benchmarks,limit,'Every saved reproducible evaluation report counts.'),
  capacity('feeds','Outcome feeds',feeds,20,'Fixed limit. Enabled and disabled feeds both count.'),
  capacity('sources','Product event sources',sources,20,'Fixed limit. Enabled and disabled sources both count.')
 ],scope:'Private record admission only. This is not provider quota, compute, traffic, storage capacity or billing evidence.'}
}})
