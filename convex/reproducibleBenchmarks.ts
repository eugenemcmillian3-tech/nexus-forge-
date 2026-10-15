import {mutation,query} from './_generated/server'
import {requireOperator} from './permissions'
import {chooseStrategy} from './adaptiveRuntime'
import {policy} from './frontierSupport'
export function benchmarkReport(){
 const observation=(i:number,extra:Record<string,unknown>={})=>({_id:String(i),metric:'task-success-rate',target:80,method:'Fixed task population',periodStart:i*100,periodEnd:i*100+90,targetMet:true,provenance:'github-report',sampleSize:10,...extra});
 const cases=[
 {key:'insufficient',domain:'sample-size',heldOut:false,rows:[observation(1)],expected:'evidence-first'},
 {key:'repeated-pass',domain:'matched-history',heldOut:false,rows:[1,2,3].map(i=>observation(i)),expected:'reuse-with-verification'},
 {key:'regression',domain:'matched-history',heldOut:false,rows:[observation(1),observation(2),observation(3,{targetMet:false})],expected:'evidence-first'},
 {key:'operator-only',domain:'provenance',heldOut:false,rows:[1,2,3].map(i=>observation(i,{provenance:'operator-recorded'})),expected:'evidence-first'},
 {key:'overlap',domain:'leakage',heldOut:true,rows:[1,2,3].map(i=>observation(i,{periodStart:0,periodEnd:1000})),expected:'evidence-first'},
 {key:'target-switch',domain:'contract-drift',heldOut:true,rows:[1,2,3].map(i=>observation(i,{target:i*10})),expected:'evidence-first'},
 {key:'method-switch',domain:'contract-drift',heldOut:true,rows:[1,2,3].map(i=>observation(i,{method:'method '+i})),expected:'evidence-first'},
 {key:'tiny-population',domain:'sample-size',heldOut:true,rows:[1,2,3].map(i=>observation(i,{sampleSize:1})),expected:'evidence-first'},
 {key:'metric-switch',domain:'contract-drift',heldOut:true,rows:[observation(1),observation(2,{metric:'revenue-usd'}),observation(3)],expected:'evidence-first'},
 {key:'latest-failure',domain:'matched-history',heldOut:true,rows:[1,2,3,4].map(i=>observation(i,{targetMet:i!==4})),expected:'evidence-first'}
 ];const results=cases.map(c=>{const baseline=c.rows.filter(r=>r.targetMet).length>=3?'reuse-with-verification':'evidence-first',candidate=chooseStrategy(c.rows).strategy;return{...c,baseline,candidate,baselinePass:baseline===c.expected,candidatePass:candidate===c.expected}});
 return{version:'outcome-policy-benchmark-v1',scope:'Deterministic policy correctness on published fixtures; not a model intelligence or independent scientific benchmark.',baseline:'Reuse after three positive rows, without provenance, overlap or drift gates',candidate:'Comparable nonoverlapping imported evidence policy',trainingUsed:false,cases:results,baselinePassed:results.filter(r=>r.baselinePass).length,candidatePassed:results.filter(r=>r.candidatePass).length,total:results.length,heldOutPassed:results.filter(r=>r.heldOut&&r.candidatePass).length,heldOutTotal:results.filter(r=>r.heldOut).length}
}
export const run=mutation({args:{},handler:async ctx=>{const ownerKey=await requireOperator(ctx),p=await policy(ctx,ownerKey);if((await ctx.db.query('benchmarkRuns').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).take(p.maxRecords)).length>=p.maxRecords)throw Error('Benchmark quota reached');const report=benchmarkReport();await ctx.db.insert('benchmarkRuns',{ownerKey,version:report.version,report:JSON.stringify(report),createdAt:Date.now()});return report}})
export const list=query({args:{},handler:async ctx=>{const ownerKey=await requireOperator(ctx);return ctx.db.query('benchmarkRuns').withIndex('by_owner',q=>q.eq('ownerKey',ownerKey)).order('desc').take(20)}})
