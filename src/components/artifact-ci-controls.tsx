import { useAction } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { StepResult } from '../../convex/artifactTestPlan'
type Ci = { branch: string; commitSha: string; snapshotSha: string; dispatchedAt?: number; runUrl?: string; attempt?: number; outcome?: 'passed' | 'failed' | 'partial'; results?: StepResult[][]; verifiedAt?: number }
export function ArtifactCiControls({ testRunId, ci, current }: { testRunId: Id<'artifactTestRuns'>; ci?: Ci; current: boolean }) {
  const publish = useAction(api.artifactCiActions.publish)
  const importRun = useAction(api.artifactCiActions.importRun)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [workflow, setWorkflow] = useState('')
  const [url, setUrl] = useState('')
  const send = async () => {
    setBusy('publish'); setError(''); setNotice('')
    try { const result = await publish({ testRunId, publishSnapshot: true }); setWorkflow(result.workflowUrl); setNotice('Snapshot published and CI dispatch requested. Open its workflow, then import the completed run below.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Snapshot publication or dispatch failed. Review access and retry.') }
    finally { setBusy('') }
  }
  const receive = async () => {
    setBusy('import'); setError(''); setNotice('')
    try { await importRun({ testRunId, runUrl: url.trim() }); setNotice('Matching GitHub CI report verified and saved. Approval and delivery are unchanged.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'CI report verification failed. Review the run and retry.') }
    finally { setBusy('') }
  }
  const workflowUrl = workflow || (ci ? 'https://github.com/nexus-forge1/nexus-forge-/actions/workflows/nexus-forge-artifact-checks.yml?query=' + encodeURIComponent('branch:' + ci.branch) : '')
  return <div className="glass-card research-card"><h4>Exact snapshot CI</h4>
    <p>Run this saved HTML and acceptance-test plan in Chromium CI. Publishing sends the artifact content, mission text, and test plan to the NEXUS FORGE GitHub repository, where repository readers can see them. It creates a dedicated test branch and does not deploy the artifact.</p>
    {!ci?.dispatchedAt && <button className="secondary-button" type="button" disabled={!!busy || !current} onClick={() => void send()}>{busy === 'publish' ? 'Publishing snapshot…' : ci ? 'Retry snapshot CI dispatch' : 'Publish saved snapshot & run CI'}</button>}
    {!current && <p>Historical snapshot: run current browser checks before publishing another snapshot. Existing CI evidence can still be inspected.</p>}
    {ci && <p className="muted-copy">Snapshot SHA-256: {ci.snapshotSha}<br />Source commit: {ci.commitSha}</p>}
    {workflowUrl && <p><a href={workflowUrl} target="_blank" rel="noreferrer">Open this snapshot's CI runs ↗</a></p>}
    {ci?.dispatchedAt && !ci.verifiedAt && <form onSubmit={event => { event.preventDefault(); void receive() }}><label htmlFor={'ci-run-' + testRunId}>COMPLETED EXACT-SNAPSHOT CI RUN URL</label><input id={'ci-run-' + testRunId} type="url" required maxLength={300} value={url} onChange={event => setUrl(event.target.value)} /><button className="secondary-button" type="submit" disabled={!!busy || !url.trim()}>{busy === 'import' ? 'Verifying GitHub report…' : 'Verify & save exact CI report'}</button></form>}
    {ci?.verifiedAt && <><p className="receipt">GitHub-verified snapshot result: {ci.outcome?.toUpperCase()} · attempt {ci.attempt}</p><a href={ci.runUrl} target="_blank" rel="noreferrer">Inspect verified CI run ↗</a><details><summary>Inspect CI step observations</summary>{ci.results?.map((steps, index) => <ol key={index}>{steps.map((step, position) => <li key={position}>{step.status.toUpperCase()}: {step.detail}</li>)}</ol>)}</details></>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </div>
}
