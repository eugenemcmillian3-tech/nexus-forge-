// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest'
import {recordTaskOutcome} from '../scripts/product-event-client.mjs'
const config={endpoint:'https://product.example.com/product-events',sourceId:'source_fixture',token:'a'.repeat(64)}
afterEach(()=>vi.unstubAllGlobals())
describe('server product event client',()=>{
 it('sends the stable identity once and accepts new and replay acknowledgments',async()=>{
  const network=vi.fn().mockResolvedValueOnce(Response.json({eventId:'event_one',reused:false,outcomeId:'outcome_one'})).mockResolvedValueOnce(Response.json({eventId:'event_one',reused:true}))
  vi.stubGlobal('fetch',network)
  expect(await recordTaskOutcome({eventKey:'task_fixture_001',success:true},config)).toMatchObject({reused:false})
  expect(await recordTaskOutcome({eventKey:'task_fixture_001',success:true},config)).toMatchObject({reused:true})
  expect(network).toHaveBeenCalledTimes(2)
  for(const [,init] of network.mock.calls){expect(JSON.parse(init.body)).toEqual({sourceId:'source_fixture',eventKey:'task_fixture_001',success:true});expect(init.redirect).toBe('error');expect(init.headers.Authorization).toBe('Bearer '+config.token)}
 })
 it('rejects browser use and invalid endpoints before transmitting a token',async()=>{
  const network=vi.fn();vi.stubGlobal('fetch',network)
  for(const endpoint of ['http://product.example.com/product-events','https://u:p@product.example.com/product-events','https://product.example.com/product-events?key=x','https://product.example.com:8443/product-events','https://product.example.com/other','bad-url'])await expect(recordTaskOutcome({eventKey:'task_fixture_001',success:true},{...config,endpoint})).rejects.toThrow(/exact HTTPS/)
  vi.stubGlobal('window',{})
  await expect(recordTaskOutcome({eventKey:'task_fixture_001',success:true},config)).rejects.toThrow(/product server/)
  expect(network).not.toHaveBeenCalled()
 })
 it('never retries rejection, malformed responses, oversized output or transport uncertainty',async()=>{
  for(const response of [new Response('private upstream detail',{status:409}),new Response('<html>upstream</html>',{headers:{'content-type':'text/html'}}),Response.json({ok:true}),Response.json({eventId:'x',reused:'yes'}),Response.json({eventId:'x',reused:false,private:config.token}),new Response('x'.repeat(9000),{headers:{'content-type':'application/json'}})]){
   const network=vi.fn().mockResolvedValue(response);vi.stubGlobal('fetch',network)
   await expect(recordTaskOutcome({eventKey:'task_fixture_001',success:false},config)).rejects.toThrow(/same event key/)
   expect(network).toHaveBeenCalledTimes(1)
  }
  const network=vi.fn().mockRejectedValue(Error('Upstream exposed '+config.token));vi.stubGlobal('fetch',network)
  try{await recordTaskOutcome({eventKey:'task_fixture_001',success:true},config);throw Error('Expected rejection')}catch(e){expect(String(e)).toContain('uncertain');expect(String(e)).not.toContain(config.token)}
  expect(network).toHaveBeenCalledTimes(1)
 })
 it('aborts a stalled request without changing its event identity or retrying',async()=>{
  const network=vi.fn((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('aborted')))))
  vi.stubGlobal('fetch',network)
  await expect(recordTaskOutcome({eventKey:'task_fixture_001',success:true},{...config,timeoutMs:100})).rejects.toThrow(/uncertain/)
  expect(network).toHaveBeenCalledTimes(1)
 })
})
