import { describe, expect, it } from 'vitest'
import { JSDOM, VirtualConsole } from 'jsdom'
import { buildArtifactTestDocument } from '../src/lib/artifact-test-runner'
import type { BrowserCase, StepResult } from '../convex/artifactTestPlan'
async function execute(content: string, plan: BrowserCase[]) {
  const dom = new JSDOM(buildArtifactTestDocument(content, plan, 'test-nonce'), { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() })
  try {
    const results = await new Promise<StepResult[][]>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Harness did not report')), 3000)
      dom.window.addEventListener('message', event => {
        if (event.data?.nonce === 'test-nonce') { clearTimeout(timeout); resolve(event.data.results) }
      })
    })
    return { results, scriptRemoved: !dom.window.document.documentElement.outerHTML.includes('const nonce='), policy: dom.window.document.querySelector('meta[http-equiv]')?.getAttribute('content') }
  } finally { dom.window.close() }
}
describe('artifact browser interaction harness with controlled fixtures', () => {
  it('executes fill/click/result assertions and browser input validity checks', async () => {
    const fixture = '<input id="amount" required><button id="calculate">Double</button><output id="result"></output><script>document.querySelector("#calculate").onclick=()=>document.querySelector("#result").textContent=String(Number(document.querySelector("#amount").value)*2)</script>'
    const plan: BrowserCase[] = [
      { criterionIndex: 0, steps: [{ action: 'fill', selector: '#amount', value: '7' }, { action: 'click', selector: '#calculate', value: '' }, { action: 'assertText', selector: '#result', value: '14' }, { action: 'assertValue', selector: '#amount', value: '7' }] },
      { criterionIndex: 1, steps: [{ action: 'fill', selector: '#amount', value: '' }, { action: 'assertInvalid', selector: '#amount', value: '' }] },
    ]
    const report = await execute(fixture, plan)
    expect(report.results.flat().every(step => step.status === 'pass')).toBe(true)
    expect(report.scriptRemoved).toBe(true)
    expect(report.policy).toContain("connect-src 'none'")
  })
  it('fails a broken behavior and marks the later step unexecuted', async () => {
    const report = await execute('<output id="result">wrong answer</output>', [{ criterionIndex: 0, steps: [{ action: 'assertText', selector: '#result', value: '14' }, { action: 'click', selector: '#result', value: '' }] }])
    expect(report.results[0].map(step => step.status)).toEqual(['fail', 'not_run'])
    expect(report.results[0][0].detail).toContain('wrong answer')
  })
  it('reports missing and malformed selectors as failures', async () => {
    const report = await execute('<p>Existing content</p>', [
      { criterionIndex: 0, steps: [{ action: 'assertText', selector: '#missing', value: 'expected' }] },
      { criterionIndex: 1, steps: [{ action: 'assertText', selector: '[', value: 'expected' }] },
    ])
    expect(report.results.every(test => test[0].status === 'fail')).toBe(true)
  })
  it('encodes plan strings so expected text cannot inject markup into the harness', () => {
    const doc = buildArtifactTestDocument('<p>Artifact</p>', [{ criterionIndex: 0, steps: [{ action: 'assertText', selector: 'body', value: '</script><p id="injected">bad</p>' }] }], 'nonce')
    expect(doc).not.toContain('</script><p id="injected">')
    expect(doc).toContain('\\u003c/script>')
  })
})

describe('exact text acceptance', () => {
  it('rejects numeric substrings and skips dependent steps while contains stays compatible', async () => {
    const report = await execute('<output id="result">140</output>', [
      { criterionIndex: 0, steps: [{ action: 'assertText', selector: '#result', value: '14' }] },
      { criterionIndex: 1, steps: [{ action: 'assertTextEquals', selector: '#result', value: '14' }, { action: 'assertTextEquals', selector: '#result', value: '140' }] },
    ])
    expect(report.results[0][0].status).toBe('pass')
    expect(report.results[1].map(step => step.status)).toEqual(['fail', 'not_run'])
    expect(report.results[1][0].detail).toContain('observed 140')
  })
  it('compares complete text including nested content, whitespace and an empty state', async () => {
    const report = await execute('<output id="result">Total: <b>14</b></output><output id="spaced"> 14 </output><output id="empty"></output>', [
      { criterionIndex: 0, steps: [{ action: 'assertTextEquals', selector: '#result', value: 'Total: 14' }] },
      { criterionIndex: 1, steps: [{ action: 'assertTextEquals', selector: '#spaced', value: '14' }] },
      { criterionIndex: 2, steps: [{ action: 'assertTextEquals', selector: '#spaced', value: ' 14 ' }] },
      { criterionIndex: 3, steps: [{ action: 'assertTextEquals', selector: '#empty', value: '' }] },
    ])
    expect(report.results.map(test => test[0].status)).toEqual(['pass', 'fail', 'pass', 'pass'])
  })
})
