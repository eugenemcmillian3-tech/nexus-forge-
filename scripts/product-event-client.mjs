// Server-side only. Keep source tokens out of browser bundles and public repositories.
export async function recordTaskOutcome({eventKey,success},{endpoint=process.env.NEXUS_PRODUCT_EVENTS_ENDPOINT,sourceId=process.env.NEXUS_PRODUCT_SOURCE_ID,token=process.env.NEXUS_PRODUCT_SOURCE_TOKEN,timeoutMs=15000}={}){
 if(typeof window!=='undefined')throw Error('Product outcome tokens must only be used on the product server')
 if(typeof endpoint!=='string'||typeof sourceId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(sourceId)||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||typeof eventKey!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(eventKey)||typeof success!=='boolean'||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw Error('Valid server-side source configuration and event identity required')
 let url;try{url=new URL(endpoint)}catch{throw Error('Use the exact HTTPS product-events endpoint')}
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/product-events'||url.search||url.hash||(url.port&&url.port!=='443'))throw Error('Use the exact HTTPS product-events endpoint')
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs)
 let reader,response,rejectedStatus
 try{
  response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({sourceId,eventKey,success}),redirect:'error',signal:controller.signal})
  if(!response.ok){rejectedStatus=response.status;throw Error('Rejected acknowledgment')}
  if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??''))throw Error('Invalid acknowledgment')
  reader=response.body?.getReader();if(!reader)throw Error('Missing acknowledgment')
  const chunks=[];let size=0
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192)throw Error('Oversized acknowledgment');chunks.push(value)}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}
  const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data))
  if(!result||typeof result!=='object'||Array.isArray(result)||Object.keys(result).some(k=>!['eventId','reused','outcomeId'].includes(k))||typeof result.eventId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(result.eventId)||typeof result.reused!=='boolean'||(result.outcomeId!==undefined&&(typeof result.outcomeId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(result.outcomeId))))throw Error('Invalid acknowledgment')
  return result
 }catch(error){
  // Do not forward provider/network messages: they may contain credentials or response data.
  if(rejectedStatus!==undefined)throw Error('Product event rejected (HTTP '+rejectedStatus+'). Retain the same event key if reconciling an uncertain response.')
  throw Error('Product event acknowledgment is uncertain. Retain the same event key and success value when reconciling; no automatic retry was made.')
 }finally{clearTimeout(timer);if(reader)await reader.cancel().catch(()=>{});else await response?.body?.cancel().catch(()=>{})}
}
