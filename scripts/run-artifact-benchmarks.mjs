import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { artifactBenchmarks, benchmarkSuite } from '../convex/artifactBenchmarkCatalog.ts'
import { buildArtifactTestDocument } from '../src/lib/artifact-test-runner.ts'

// Browser tooling lives outside the application dependency tree.
const require = createRequire(process.env.NEXUS_BROWSER_PACKAGE + '/package.json')
const { chromium } = require('playwright')
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
const report = { suiteVersion: benchmarkSuite.version, engine: 'chromium', browserVersion: browser.version(), cases: [] }
try {
  for (const fixture of artifactBenchmarks) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' })
    await context.route('**/*', route => route.abort())
    try {
      const page = await context.newPage()
      await page.setContent('<!doctype html><html><body><iframe sandbox="allow-scripts"></iframe></body></html>')
      const nonce = 'chromium-' + fixture.id
      const document = buildArtifactTestDocument('<!doctype html><html><head><title>Controlled fixture</title></head><body>' + fixture.html + '</body></html>', fixture.plan, nonce)
      const results = await page.evaluate(({ document, nonce }) => new Promise((resolve, reject) => {
        const frame = window.document.querySelector('iframe')
        const timer = setTimeout(() => reject(new Error('Benchmark response timed out')), 10000)
        window.addEventListener('message', event => {
          if (event.source === frame.contentWindow && event.data?.nonce === nonce && event.data?.type === 'nexus-artifact-tests') {
            clearTimeout(timer); resolve(event.data.results)
          }
        })
        frame.srcdoc = document
      }), { document, nonce })
      const shape = Array.isArray(results) && results.length === fixture.plan.length && results.every((steps, index) => Array.isArray(steps) && steps.length === fixture.plan[index].steps.length && steps.every(step => ['pass', 'fail', 'not_run'].includes(step.status)))
      const flat = shape ? results.flat() : []
      const observed = !shape ? 'invalid' : flat.some(step => step.status === 'fail') ? 'fail' : flat.every(step => step.status === 'pass') ? 'pass' : 'not_run'
      report.cases.push({ id: fixture.id, expected: fixture.expected, observed, matched: observed === fixture.expected, results })
    } catch (error) {
      report.cases.push({ id: fixture.id, expected: fixture.expected, observed: 'runner_error', matched: false, error: String(error.message || error).slice(0, 1000) })
    } finally { await context.close() }
  }
} finally {
  await browser.close()
  await writeFile('artifact-dom-v3-chromium.json', JSON.stringify(report, null, 2))
}
const matched = report.cases.filter(item => item.matched).length
console.log(benchmarkSuite.version + ': ' + matched + '/' + artifactBenchmarks.length + ' Chromium fixtures matched expected outcomes')
if (matched !== artifactBenchmarks.length) process.exitCode = 1
