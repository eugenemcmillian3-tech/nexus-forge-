import type { BrowserCase } from './artifactTestPlan'
export const benchmarkSuite = {
  version: 'artifact-dom-v1',
  repository: 'eugenemcmillian3-tech/nexus-forge-',
  workflowPath: '.github/workflows/ci.yml',
  jobName: 'Artifact DOM benchmarks v1',
  stepName: 'Run artifact DOM benchmark suite v1',
} as const
export type ArtifactBenchmark = { id: string; title: string; purpose: string; html: string; plan: BrowserCase[]; expected: 'pass' | 'fail' }
const field = '<input id="amount" required><button id="calculate">Double</button><output id="result"></output>'
const implementation = field + '<script>document.querySelector("#calculate").onclick=()=>document.querySelector("#result").textContent=String(Number(document.querySelector("#amount").value)*2)</script>'
const step = (action: BrowserCase['steps'][number]['action'], selector: string, value = '') => ({ action, selector, value })
const check = (...steps: BrowserCase['steps']): BrowserCase[] => [{ criterionIndex: 0, steps }]
export const artifactBenchmarks: ArtifactBenchmark[] = [
  { id: 'double-positive', title: 'Compute a doubled result', purpose: 'Fill/click/assert observes a working implementation.', html: implementation, plan: check(step('fill', '#amount', '7'), step('click', '#calculate'), step('assertText', '#result', '14')), expected: 'pass' },
  { id: 'zero-recompute', title: 'Recompute zero after a prior result', purpose: 'Catch stale result behavior when input changes to zero.', html: implementation, plan: check(step('fill', '#amount', '7'), step('click', '#calculate'), step('fill', '#amount', '0'), step('click', '#calculate'), step('assertText', '#result', '0')), expected: 'pass' },
  { id: 'required-validation', title: 'Reject an empty required field', purpose: 'Exercise browser field validity rather than a self-reported quality claim.', html: field, plan: check(step('assertInvalid', '#amount')), expected: 'pass' },
  { id: 'wrong-result-control', title: 'Detect incorrect computation', purpose: 'Negative control: a wrong implementation must fail its assertion.', html: field + '<script>document.querySelector("#calculate").onclick=()=>document.querySelector("#result").textContent=document.querySelector("#amount").value</script>', plan: check(step('fill', '#amount', '7'), step('click', '#calculate'), step('assertText', '#result', '14')), expected: 'fail' },
  { id: 'inert-button-control', title: 'Detect an inert control', purpose: 'Negative control: a button without behavior must not pass.', html: field, plan: check(step('fill', '#amount', '7'), step('click', '#calculate'), step('assertText', '#result', '14')), expected: 'fail' },
  { id: 'missing-output-control', title: 'Detect a missing output element', purpose: 'Negative control: missing targets must produce a failure.', html: '<p>No result element exists.</p>', plan: check(step('assertText', '#result', '14')), expected: 'fail' },
]
