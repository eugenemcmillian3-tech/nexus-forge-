import { writeFile } from 'node:fs/promises'
import { allWorkspaces } from '../src/lib/workspaces.ts'
import { productionOrigin, inspectPublicShell, summarizeProbe, confirmsAnonymousDenial } from '../src/lib/production-probe.ts'
const productionBackend = process.env.RELEASE_BACKEND_URL
if (!productionBackend) throw new Error('Set RELEASE_BACKEND_URL to the verified Live Convex URL')
const backendUrl = new URL(productionBackend)
if (backendUrl.protocol !== 'https:' || !backendUrl.hostname.endsWith('.convex.cloud') || backendUrl.username || backendUrl.password || backendUrl.port || backendUrl.pathname !== '/' || backendUrl.search || backendUrl.hash) throw new Error('Invalid Live Convex probe target')
const full = process.env.RELEASE_PROBE_MODE !== 'monitor'
const paths = full ? allWorkspaces.map(page => page.path) : ['/', '/workflow', '/artifacts', '/delivery']
const rounds = full ? 2 : 1
const jobs = Array.from({ length: rounds }, (_, round) => paths.map(path => ({ path, round: round + 1 }))).flat()
const rows = []
let cursor = 0
async function probe(job) {
  const start = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    let url = new URL(job.path, productionOrigin)
    let response
    for (let redirects = 0; redirects <= 3; redirects++) {
      response = await fetch(url, { signal: controller.signal, redirect: 'manual', headers: { 'User-Agent': 'NEXUS-FORGE-production-probe/1' } })
      if (![301, 302, 303, 307, 308].includes(response.status)) break
      const next = new URL(response.headers.get('location') || '', url)
      await response.body?.cancel()
      if (next.origin !== productionOrigin || redirects === 3) throw new Error('Unexpected redirect')
      url = next
    }
    if (url.pathname.replace(/\/$/, '') !== job.path.replace(/\/$/, '')) throw new Error('Unexpected route destination')
    const reader = response.body?.getReader()
    const chunks = []; let bytes = 0
    if (!reader) throw new Error('Missing response body')
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > 524288) { await reader.cancel(); throw new Error('Response exceeds bounded probe size') }
      chunks.push(value)
    }
    const html = new TextDecoder().decode(Buffer.concat(chunks))
    const problem = inspectPublicShell(response.status, response.headers.get('content-type') || '', html)
    return { ...job, ok: !problem, status: response.status, bytes, durationMs: Math.round(performance.now() - start), detail: problem || 'Public HTML shell passed' }
  } catch { return { ...job, ok: false, durationMs: Math.round(performance.now() - start), detail: 'Request, redirect, timeout or bounded response validation failed' } }
  finally { clearTimeout(timer) }
}
await Promise.all([0, 1].map(async () => {
  while (cursor < jobs.length) { const job = jobs[cursor++]; rows.push(await probe(job)) }
}))
let anonymousAccess = { ok: false, detail: 'Private query guard was not confirmed' }
try {
  const response = await fetch(productionBackend + '/api/query', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'missions:list', args: { ownerKey: 'release-anonymous-probe', paginationOpts: { numItems: 1, cursor: null } }, format: 'json' }) })
  const payload = await response.json()
  anonymousAccess = { ok: confirmsAnonymousDenial(payload), detail: 'Read-only anonymous mission access check; no private payload retained' }
} catch { /* Network/schema errors never count as an authorization pass. */ }
const summary = summarizeProbe(rows)
const report = { version: 'production-probe-v1', origin: productionOrigin, backendOrigin: backendUrl.origin, observedAt: new Date().toISOString(), mode: full ? 'full' : 'monitor', scope: 'Public HTML shells and one anonymous private-query denial; not authenticated end-to-end or sustained load certification', concurrency: 2, rounds, rows, anonymousAccess, summary, passed: summary.passedWithinBudget && anonymousAccess.ok }
await writeFile(process.env.RELEASE_REPORT_PATH || '/tmp/nexus-production-probe.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({ version: report.version, observedAt: report.observedAt, summary, anonymousAccessDenied: anonymousAccess.ok, passed: report.passed }))
if (!report.passed) process.exitCode = 1
