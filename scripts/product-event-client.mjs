// Server-side only. Keep source tokens out of browser bundles and public repositories.
export async function recordTaskOutcome({eventKey,success},{endpoint=process.env.NEXUS_PRODUCT_EVENTS_ENDPOINT,sourceId=process.env.NEXUS_PRODUCT_SOURCE_ID,token=process.env.NEXUS_PRODUCT_SOURCE_TOKEN}={}){
 if(!endpoint||!sourceId||!token||!/^[a-f0-9]{64}$/.test(token)||!/^[A-Za-z0-9_-]{8,100}$/.test(eventKey)||typeof success!=='boolean')throw Error('Valid server-side source configuration and event identity required')
 const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/product-events'||url.search||url.hash)throw Error('Use the exact HTTPS product-events endpoint')
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({sourceId,eventKey,success}),redirect:'error',signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw Error('Product event rejected (HTTP '+response.status+'). Retain the same event key if reconciling an uncertain response.')
 return response.json()
}
