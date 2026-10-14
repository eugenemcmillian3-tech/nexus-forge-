import { describe, expect, it } from 'vitest'
import { JSDOM, VirtualConsole } from 'jsdom'
import { artifactBenchmarks, benchmarkSuite } from '../convex/artifactBenchmarkCatalog'
import { buildArtifactTestDocument } from '../src/lib/artifact-test-runner'
import type { StepResult } from '../convex/artifactTestPlan'
describe(benchmarkSuite.version + ' controlled behavior suite', () => {
  it.each(artifactBenchmarks)('$id — $title', async fixture => {
    const nonce = 'benchmark-' + fixture.id
    const dom = new JSDOM(buildArtifactTestDocument('<!doctype html><html><head><title>Controlled fixture</title></head><body>' + fixture.html + '</body></html>', fixture.plan, nonce), { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() })
    try {
      const results = await new Promise<StepResult[][]>((resolve, reject) => {
        const deadline = setTimeout(() => reject(new Error('No benchmark result received')), 3000)
        dom.window.addEventListener('message', event => {
          if (event.data?.nonce === nonce) { clearTimeout(deadline); resolve(event.data.results) }
        })
      })
      expect(results).toHaveLength(fixture.plan.length)
      const observed = results.flat().some(step => step.status === 'fail') ? 'fail' : results.flat().every(step => step.status === 'pass') ? 'pass' : 'not_run'
      expect(observed).toBe(fixture.expected)
      if (fixture.id === 'unsupported-fill-control') expect(results[0].map(step => step.status)).toEqual(['fail', 'not_run'])
    } finally { dom.window.close() }
  })
})
