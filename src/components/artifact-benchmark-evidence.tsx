import { useAction, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { artifactBenchmarks, benchmarkSuite } from '../../convex/artifactBenchmarkCatalog'

export function ArtifactBenchmarkEvidence() {
  const history = useQuery(api.benchmarks.history, {})
  const verify = useAction(api.benchmarks.verifyRun)
  const [runUrl, setRunUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState('')
  const importRun = async () => {
    setBusy(true); setError(''); setReceipt('')
    try { const id = await verify({ runUrl: runUrl.trim() }); setReceipt('GitHub CI receipt saved · ' + id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not verify this CI run. Check the run URL and retry.') }
    finally { setBusy(false) }
  }
  return <div className="glass-card research-card" id="artifact-benchmarks">
    <div className="panel-title"><span>ARTIFACT BEHAVIOR BENCHMARKS</span><span className="live-pill">{benchmarkSuite.version}</span></div>
    <p>A repeatable suite of {artifactBenchmarks.length} controlled DOM fixtures exercises the interaction runner. Broken examples are expected to fail their assertions; the suite passes when those failures are correctly detected. CI runs the same plans in JSDOM and isolated Chromium with network requests blocked. Both engines must match the expected outcomes. These authored fixtures do not certify a generated artifact, external integrations, layout coverage or product outcomes.</p>
    <details><summary>Inspect benchmark cases and expected detection</summary>{artifactBenchmarks.map(test => <div className="guard-item" key={test.id}><span>{test.expected === 'fail' ? '!' : '✓'}</span><div><strong>{test.title}</strong><small>{test.purpose}</small><small>{test.expected === 'fail' ? 'Expected assertion failure — negative control' : 'Expected interaction pass'}</small></div></div>)}</details>
    <div className="hero-actions"><a className="secondary-button" href={'https://github.com/' + benchmarkSuite.repository + '/actions/workflows/ci.yml'} target="_blank" rel="noreferrer">Open CI runs & benchmark reports ↗</a></div>
    <p>Choose a completed CI run containing “{benchmarkSuite.jobName}”, then paste its run URL below. The server checks GitHub's repository, workflow, commit, attempt, job, and both JSDOM/Chromium step outcomes. This records GitHub's job result; it does not import test counts from a browser or claim a signed artifact attestation.</p>
    <form onSubmit={event => { event.preventDefault(); void importRun() }}>
      <label htmlFor="benchmark-run-url">COMPLETED NEXUS FORGE CI RUN URL</label>
      <input id="benchmark-run-url" type="url" required maxLength={300} value={runUrl} onChange={event => setRunUrl(event.target.value)} placeholder={'https://github.com/' + benchmarkSuite.repository + '/actions/runs/…'} />
      <button className="secondary-button" type="submit" disabled={busy || !runUrl.trim()}>{busy ? 'Checking GitHub evidence…' : 'Verify CI run & save receipt'}</button>
    </form>
    {error && <p role="alert">{error}</p>}{receipt && <p role="status">{receipt}</p>}
    <h3>Saved CI receipts</h3>
    {history === undefined ? <p>Loading saved CI evidence…</p> : history.length === 0 ? <p>No verified CI receipt saved in this operator account yet. A defined suite is not a recorded pass.</p> : history.map(row => <article className="evidence-item" key={row._id}><span className="time">{row.outcome === 'passed' ? 'SUITE PASSED' : row.outcome === 'failed' ? 'SUITE FAILED' : 'NOT RUN'}</span><div><b>{row.suiteVersion} · attempt {row.attempt}</b><p>Commit: {row.commitSha}</p><p>{row.jobName} · job {row.jobConclusion} · overall workflow {row.runConclusion}</p><p className="muted-copy">Checked {new Date(row.recordedAt).toLocaleString()} · Receipt {row._id}</p><a href={row.runUrl} target="_blank" rel="noreferrer">Inspect GitHub run & report ↗</a></div></article>)}
  </div>
}
