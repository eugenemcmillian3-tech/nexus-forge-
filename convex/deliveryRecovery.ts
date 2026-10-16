import {ConvexError} from 'convex/values'
export function qaCallbackInputs(target:string,branch:string,origin:string|undefined){
 if(target!=='nexus-forge1/no-dispatch'||branch!=='qa-only')return {}
 if(!origin)throw new ConvexError('QA callback origin is unavailable')
 const url=new URL(origin)
 if(url.protocol!=='https:'||!url.hostname.endsWith('.convex.site')||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw new ConvexError('Invalid QA callback origin')
 return {callback_origin:url.origin}
}
export function assertRetryRun(run:any,id:string,branch:string,runId:string){
 if(!run||String(run.id)!==runId||run.status!=='completed'||!['failure','cancelled','timed_out'].includes(run.conclusion)||run.head_branch!==branch||run.event!=='workflow_dispatch'||run.path!=='.github/workflows/nexus-forge-delivery.yml'||run.head_commit?.message!==('nexus-forge: deliver '+id))throw new ConvexError('Latest GitHub run is not a matching completed failed delivery')
}
