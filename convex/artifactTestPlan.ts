export type BrowserStep = { action: 'fill' | 'click' | 'assertText' | 'assertTextEquals' | 'assertValue' | 'assertVisible' | 'assertInvalid'; selector: string; value: string }
export type BrowserCase = { criterionIndex: number; steps: BrowserStep[] }
export type StepResult = { status: 'pass' | 'fail' | 'not_run'; detail: string }
export const browserRunnerVersion = 'sandbox-dom-v2'

export function extractAcceptanceCriteria(contract: string): string[] {
  const lines = contract.split(/\r?\n/)
  const start = lines.findIndex(line => /^(?:\s*#{1,6}\s*)?\s*(?:\d+[.)]\s*)?acceptance criteria\s*:?/i.test(line))
  if (start < 0) return []
  const first = lines[start].replace(/^(?:\s*#{1,6}\s*)?\s*(?:\d+[.)]\s*)?acceptance criteria\s*:?\s*/i, '').trim()
  if (first) return [first]
  const criteria: string[] = []
  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim()
    if (/^(?:#{1,6}\s*)?(?:[A-Z][A-Z _-]{2,}:|(?:risks?|constraints?|dependencies|deadline|governance|time horizon|budget|blueprint)\b.*:)/.test(line)) break
    if (/^(?:#{1,6}\s*)?(?:risks?|constraints?|dependencies|deadline|governance|time horizon|budget|blueprint)\b.*:/i.test(line)) break
    if (line) criteria.push(line.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, ''))
  }
  return criteria
}

export function validateBrowserPlan(criteria: string[], plan: BrowserCase[]) {
  if (!criteria.length) throw new Error('The saved mission needs an explicit ACCEPTANCE CRITERIA section before browser checks can be recorded.')
  if (!plan.length || plan.length > 20) throw new Error('Choose between 1 and 20 criterion checks.')
  const used = new Set<number>()
  const actions = new Set(['fill', 'click', 'assertText', 'assertTextEquals', 'assertValue', 'assertVisible', 'assertInvalid'])
  for (const test of plan) {
    if (!Number.isInteger(test.criterionIndex) || test.criterionIndex < 0 || test.criterionIndex >= criteria.length || used.has(test.criterionIndex)) throw new Error('Each check must map to one distinct saved acceptance criterion.')
    used.add(test.criterionIndex)
    if (!test.steps.length || test.steps.length > 12) throw new Error('Each criterion check needs 1–12 steps.')
    if (!test.steps.some(step => step.action.startsWith('assert'))) throw new Error('Every criterion check needs an assertion, not only interaction steps.')
    for (const step of test.steps) {
      if (!actions.has(step.action) || !step.selector.trim() || step.selector.length > 200 || step.value.length > 2000) throw new Error('A browser step has an invalid action, selector, or expected value.')
      if (step.action === 'assertText' && !step.value.trim()) throw new Error('Text assertions need non-empty expected text.')
    }
  }
}

export function summarizeBrowserRun(criteria: string[], plan: BrowserCase[], results: StepResult[][]) {
  validateBrowserPlan(criteria, plan)
  if (results.length !== plan.length || results.some((steps, index) => steps.length !== plan[index].steps.length)) throw new Error('The browser report does not match the test plan.')
  const states = results.map(steps => {
    if (steps.some(step => !['pass', 'fail', 'not_run'].includes(step.status) || step.detail.length > 1000)) throw new Error('Invalid browser step evidence.')
    return steps.some(step => step.status === 'fail') ? 'fail' : steps.every(step => step.status === 'pass') ? 'pass' : 'not_run'
  })
  const passed = states.filter(state => state === 'pass').length
  const failed = states.filter(state => state === 'fail').length
  const notRun = states.filter(state => state === 'not_run').length
  const covered = plan.length
  return { passed, failed, notRun, covered, total: criteria.length, allPassed: covered === criteria.length && passed === criteria.length }
}
