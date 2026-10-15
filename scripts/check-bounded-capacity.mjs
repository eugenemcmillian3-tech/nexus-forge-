// Bounded public-shell observation. No authentication, provider calls or writes.
import { performance } from 'node:perf_hooks'
const origin = 'https://bphntw8kdojl9qvuifywyjtk.macaly.app'
const paths = ['/', '/mission', '/council', '/manifest', '/workflow', '/readiness', '/providers', '/delivery']
const startedAt = new Date().toISOString(), started = performance.now()
const samples = []
let requests = 0, failures = 0, stop = false
await Promise.all(Array.from({ length: 8 }, (_, worker) => (async () => {
  for (let i=0; i<60 && !stop; i++) {
    const tick = performance.now(), path = paths[(worker+i)%paths.length]
    let ok = false, status = 0, bytes = 0
    try {
      const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(10000), redirect: 'error' })
      status = response.status
      const reader = response.body.getReader()
      let text = ''
      const decoder = new TextDecoder()
      while (true) {
        const row = await reader.read()
        if (row.done) break
        bytes += row.value.length
        if (bytes > 512*1024) { await reader.cancel(); throw Error('Response bound exceeded') }
        text += decoder.decode(row.value, { stream: true })
      }
      ok = response.ok && /<html[\s>]/i.test(text) && /NEXUS FORGE/i.test(text)
    } catch { /* Bounded failure recorded below. */ }
    samples.push({ path, ms: Math.round(performance.now()-tick), status, ok, bytes })
    requests++; if (!ok) failures++
    if (failures >= 5) stop = true
    const wait = 1000-(performance.now()-tick)
    if (wait > 0 && !stop) await new Promise(resolve => setTimeout(resolve, wait))
  }
})()))
const sorted = samples.map(x=>x.ms).sort((a,b)=>a-b)
const percentile = p => sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)] ?? null
const result = { version:'bounded-public-capacity-v1', startedAt, observedAt:new Date().toISOString(), workers:8, maxRequests:480, requests, failures, stoppedEarly:stop, durationMs:Math.round(performance.now()-started), p50Ms:percentile(.5), p95Ms:percentile(.95), maxMs:sorted.at(-1), totalBytes:samples.reduce((sum,x)=>sum+x.bytes,0), passed:requests===480 && failures===0 && percentile(.95)<=2000, scope:'Public route shells only; paced 8 workers, 60 iterations each. Proposed 2-second p95 engineering budget, not an agreed SLA or authenticated inference capacity.' }
console.log(JSON.stringify(result))
if (!result.passed) process.exitCode=1
