import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { extractAcceptanceCriteria, summarizeBrowserRun, validateBrowserPlan } from '../../convex/artifactTestPlan'
import type { BrowserCase, BrowserStep, StepResult } from '../../convex/artifactTestPlan'
import { buildArtifactTestDocument } from '../lib/artifact-test-runner'

const newStep = (): BrowserStep => ({ action: 'assertText', selector: 'body', value: '' })
export function ArtifactBrowserChecks({ artifact, missionContract }: { artifact: { _id: Id<'artifacts'>; content: string }; missionContract: string }) {
  const criteria = extractAcceptanceCriteria(missionContract)
  const selectors = [...new Set([...artifact.content.matchAll(/\\bid\\s*=\\s*["']([A-Za-z_][A-Za-z0-9_-]*)["']/g)].map(match => '#' + match[1]))].slice(0,40)
  const [plan, setPlan] = useState<BrowserCase[]>([])
  const [run, setRun] = useState<{ nonce: string; html: string; plan: BrowserCase[]; mission: string; artifact: string } | null>(null)
  const [unsaved, setUnsaved] = useState<{ plan: BrowserCase[]; results: StepResult[][]; mission: string; artifact: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)
  const record = useMutation(api.artifactTests.record)
  const history = useQuery(api.artifactTests.list, { artifactId: artifact._id })
  const busy = !!run || saving

  const saveReport = async (report: NonNullable<typeof unsaved>) => {
    setSaving(true); setError('')
    try {
      const id = await record({ artifactId: artifact._id, missionSnapshot: report.mission, artifactSnapshot: report.artifact, plan: report.plan, results: report.results })
      setUnsaved(null); setReceipt('Browser evidence saved · ' + id + '. Approval and delivery state are unchanged.')
    } catch (cause) { setUnsaved(report); setError(cause instanceof Error ? cause.message : 'Could not save browser evidence. Retry saving the report.') }
    finally { setSaving(false) }
  }

  useEffect(() => {
    if (!run) return
    const timeout = window.setTimeout(() => { setRun(null); setError('Browser checks timed out. No passing result was saved. Review the artifact and try a smaller plan.') }, 25000)
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'nexus-artifact-tests' || event.data?.nonce !== run.nonce) return
      try {
        summarizeBrowserRun(extractAcceptanceCriteria(run.mission), run.plan, event.data.results)
        window.clearTimeout(timeout)
        setRun(null)
        const report = { plan: run.plan, results: event.data.results as StepResult[][], mission: run.mission, artifact: run.artifact }
        setUnsaved(report)
        void saveReport(report)
      } catch { setRun(null); setError('The browser returned an incomplete report. No passing result was saved.') }
    }
    window.addEventListener('message', receive)
    return () => { window.clearTimeout(timeout); window.removeEventListener('message', receive) }
  }, [run])

  const start = () => {
    setError(''); setReceipt('')
    try {
      validateBrowserPlan(criteria, plan)
      const nonce = window.crypto.randomUUID()
      setUnsaved(null)
      setRun({ nonce, plan: structuredClone(plan), mission: missionContract, artifact: artifact.content, html: buildArtifactTestDocument(artifact.content, plan, nonce) })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review the browser test plan.') }
  }
  const editStep = (caseIndex: number, stepIndex: number, patch: Partial<BrowserStep>) => setPlan(current => current.map((test, index) => index === caseIndex ? { ...test, steps: test.steps.map((step, position) => position === stepIndex ? { ...step, ...patch } : step) } : test))

  return <details className="glass-card research-card"><summary>Browser checks against saved acceptance criteria</summary>
    <p>Configure interactions and assertions, then run them in an isolated test frame. Checks run sequentially on one fresh page; set up each case's input explicitly. Browser reports are client-reported evidence, separate from structural verification, approval, deployment, and real user outcomes.</p>
    {!criteria.length ? <p>The saved mission needs an explicit ACCEPTANCE CRITERIA section before criteria can be tested. No criteria are inferred or marked passed.</p> : <>
      <ol>{criteria.map((criterion, index) => <li key={index}>{criterion} <button className="ghost-button" type="button" disabled={busy || plan.length >= 20 || plan.some(test => test.criterionIndex === index)} onClick={() => setPlan(current => [...current, { criterionIndex: index, steps: [newStep()] }])}>Add criterion check</button></li>)}</ol>
      {plan.map((test, caseIndex) => <fieldset key={test.criterionIndex} disabled={busy}><legend>{criteria[test.criterionIndex]}</legend>
        {test.steps.map((step, stepIndex) => <div className="field-grid" key={stepIndex}>
          <div><label htmlFor={artifact._id + '-action-' + caseIndex + '-' + stepIndex}>STEP {stepIndex + 1} ACTION</label><select id={artifact._id + '-action-' + caseIndex + '-' + stepIndex} value={step.action} onChange={event => editStep(caseIndex, stepIndex, { action: event.target.value as BrowserStep['action'] })}><option value="fill">Fill field</option><option value="click">Click</option><option value="assertText">Assert text contains</option><option value="assertValue">Assert field value</option><option value="assertVisible">Assert visible</option><option value="assertInvalid">Assert invalid input</option></select></div>
          <div><label htmlFor={artifact._id + '-selector-' + caseIndex + '-' + stepIndex}>CSS SELECTOR</label><input id={artifact._id + '-selector-' + caseIndex + '-' + stepIndex} value={step.selector} maxLength={200} onChange={event => editStep(caseIndex, stepIndex, { selector: event.target.value })} placeholder="#result" /></div>
          {['fill', 'assertText', 'assertValue'].includes(step.action) && <div><label htmlFor={artifact._id + '-value-' + caseIndex + '-' + stepIndex}>INPUT / EXPECTED VALUE</label><input id={artifact._id + '-value-' + caseIndex + '-' + stepIndex} value={step.value} maxLength={2000} onChange={event => editStep(caseIndex, stepIndex, { value: event.target.value })} /></div>}
          <button className="ghost-button" type="button" onClick={() => setPlan(current => current.map((item, index) => index === caseIndex ? { ...item, steps: item.steps.filter((_, position) => position !== stepIndex) } : item))}>Remove step {stepIndex + 1}</button>
        </div>)}
        <button className="secondary-button" type="button" disabled={test.steps.length >= 12} onClick={() => setPlan(current => current.map((item, index) => index === caseIndex ? { ...item, steps: [...item.steps, newStep()] } : item))}>Add step</button>
        <button className="ghost-button" type="button" onClick={() => setPlan(current => current.filter((_, index) => index !== caseIndex))}>Remove criterion check</button>
      </fieldset>)}
      <p>Example: fill #amount with 7, click #calculate, then assert #result contains 14. Use the selectors for your own artifact and an expected result taken from the acceptance criterion.</p>{selectors.length > 0 && <details><summary>Available ID selectors from this artifact</summary><p>{selectors.join(", ")}</p></details>}<p>External connections, form submission, and embedded frames are restricted in this test environment; browser checks cannot prove external services or downloads work.</p>
      <button className="secondary-button" type="button" disabled={busy || !plan.length} onClick={start}>{run ? 'Running browser checks…' : saving ? 'Saving evidence…' : 'Run browser checks & save evidence'}</button>
    </>}
    {run && <><iframe ref={frame} title="Isolated artifact test browser" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={run.html} style={{ width: '100%', height: 360, background: 'white' }} /><button className="ghost-button" type="button" onClick={() => { setRun(null); setError('Browser checks stopped. No passing result was saved.') }}>Stop browser checks</button></>}
    {error && <p role="alert">{error}</p>}{receipt && <p role="status">{receipt}</p>}
    {unsaved && !saving && <button className="secondary-button" type="button" onClick={() => void saveReport(unsaved)}>Retry saving browser evidence</button>}
    <h4>Saved browser evidence</h4>
    {history === undefined ? <p>Loading browser evidence…</p> : history.length === 0 ? <p>No browser checks recorded for this artifact. Structural verification does not execute these interactions.</p> : history.map(row => <article key={row._id}><strong>{row.allPassed ? 'All saved criteria reported passed' : 'Review required'} · {row.passed}/{row.total} criteria passed</strong><p>{row.covered}/{row.total} covered · {row.failed} failed · {row.notRun} not run · {new Date(row.createdAt).toLocaleString()}</p>{(row.missionSnapshot !== missionContract || row.artifactSnapshot !== artifact.content) && <p className="warning">Historical snapshot: current mission or artifact differs. Run current checks before relying on it.</p>}<button className="ghost-button" type="button" disabled={busy || row.missionSnapshot !== missionContract} onClick={() => { setPlan(structuredClone(row.plan)); setReceipt("Saved plan loaded. Review its expected results, then run it again."); setError("") }}>Use saved test plan</button><details><summary>Inspect steps and observed evidence · {row._id}</summary>{row.plan.map((test, index) => <div key={index}><b>{row.criteria[test.criterionIndex]}</b><ol>{row.results[index].map((result, position) => <li key={position}>{test.steps[position].action} · {test.steps[position].selector} · {result.status.toUpperCase()}: {result.detail}</li>)}</ol></div>)}</details></article>)}
  </details>
}
