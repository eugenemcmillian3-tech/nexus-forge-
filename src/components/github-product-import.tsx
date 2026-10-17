import { useAction } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function GitHubProductImport({ missionId }: { missionId: Id<'missions'> }) {
  const importReport = useAction(api.productEvidenceImport.importReport)
  const [commitSha, setCommitSha] = useState('')
  const [reportId, setReportId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState('')
  const path = 'nexus-forge-outcomes/' + missionId + '/' + (reportId || 'REPORT_ID') + '.json'
  const run = async () => {
    setBusy(true); setError(''); setReceipt('')
    try { const id = await importReport({ missionId, commitSha: commitSha.trim(), reportId: reportId.trim() }); setReceipt('Imported GitHub report receipt · ' + id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Report import failed. Review the source path and report contract, then retry.') }
    finally { setBusy(false) }
  }
  return <details><summary>Import a committed GitHub outcome report</summary>
    <p>Commit a product-outcome-v1 JSON report to nexus-forge1/nexus-forge- at the path below, then import its exact source commit. Report content is visible to repository readers. The app reads it with the existing server GitHub connection and retains source identities; report figures remain repository-authored observations.</p>
    <p>Report path: <code>{path}</code></p>
    <form onSubmit={event => { event.preventDefault(); void run() }}>
      <label htmlFor="outcome-report-id">REPORT ID</label><input id="outcome-report-id" required pattern="[A-Za-z0-9_-]{1,64}" maxLength={64} value={reportId} onChange={event => setReportId(event.target.value)} />
      <label htmlFor="outcome-report-commit">EXACT SOURCE COMMIT SHA</label><input id="outcome-report-commit" required pattern="[A-Fa-f0-9]{40}" maxLength={40} value={commitSha} onChange={event => setCommitSha(event.target.value)} />
      <button className="secondary-button" disabled={busy || !/^[a-f0-9]{40}$/i.test(commitSha.trim()) || !/^[A-Za-z0-9_-]{1,64}$/.test(reportId.trim())}>{busy ? 'Reading pinned GitHub report…' : 'Import pinned outcome report'}</button>
    </form>
    {error && <p role="alert">{error}</p>}{receipt && <p role="status">{receipt}</p>}
    <details><summary>Report JSON contract and example template</summary><p>Replace every placeholder with observed evidence. periodStart/periodEnd are completed-period epoch milliseconds; zero dates below are invalid placeholders. Task success uses successful count as observed and attempts as sampleSize. Other metric choices: active-users, paid-customers, revenue-usd, task-time-seconds. Maximum report size: 64 KiB.</p><pre className="whitespace-pre-wrap break-words">{JSON.stringify({ version: 'product-outcome-v1', missionId, metric: 'task-success-rate', observed: 0, target: 0, sampleSize: 1, periodStart: 0, periodEnd: 0, method: 'REPLACE with metric definition and collection method', evidence: ['REPLACE with actual report/evidence reference'], notes: 'REPLACE with limitations and conditions' }, null, 2)}</pre></details>
    <p className="muted-copy">Identical commit/path imports return the original private receipt. New commits create new observations. A GitHub source identity does not independently verify analytics, revenue, or causal strategy effectiveness.</p>
  </details>
}
