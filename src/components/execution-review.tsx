import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function ExecutionReview({ claimId }: { claimId: Id<'executionClaims'> }) {
  const evidence = useQuery(api.executionReview.evidence, { claimId })
  const record = useMutation(api.executionReview.record)
  const [note, setNote] = useState('')
  const [decision, setDecision] = useState<'hold' | 'escalate' | 'retry-unstarted' | 'confirm-completion'>('hold')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  if (!evidence) return <p role="status">Loading execution evidence…</p>
  async function save() {
    if (!evidence) return
    setBusy(true); setError(''); setMessage('')
    try {
      await record({ claimId, evidenceToken: evidence.evidenceToken, decision, note })
      setNote(''); setMessage(decision === 'confirm-completion' ? 'Saved Council completion confirmed. No inference or workflow advance was scheduled.' : decision === 'retry-unstarted' ? 'Unstarted retry authorized. The runner will recheck execution prerequisites.' : 'Review recorded. Execution remains blocked.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save review') }
    finally { setBusy(false) }
  }
  return <div className="research-card">
    <h4>Execution evidence</h4>
    <p>{evidence.effectCount}{evidence.effectsTruncated ? '+' : ''} retained effect receipts. {evidence.providerScope === 'runner-council' ? 'Provider records are linked to this runner’s Council work.' : 'Provider calls cannot be attributed to this claim. An empty list does not establish that no inference occurred.'}</p>
    {(evidence.effectsTruncated || evidence.invocationsTruncated) && <p role="note">This evidence view is bounded. Additional records require investigation.</p>}
    <details><summary>Saved Council inputs</summary>{evidence.context ? <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{evidence.context}</pre> : <p>No usable saved context exists for this claim. Legacy work may not have captured inputs.</p>}</details>
    {evidence.invocations.length ? <ul>{evidence.invocations.map(row => <li key={row.id}>{row.stage} · {row.outcome} · {row.recoverable ? 'durable answer retained' : 'no confirmed durable answer'} · {row.reports} usage reports · {row.id}</li>)}</ul> : <p>No linked provider records in this view.</p>}
    {evidence.lastReview && <p>Latest decision: {evidence.lastReview.decision === 'hold' ? 'Keep blocked' : 'Escalate'}. {evidence.lastReview.note}</p>}
    {evidence.status === 'uncertain' ? <>
      <label htmlFor={'decision-'+claimId}>Recovery decision</label>
      <select id={'decision-'+claimId} value={decision} onChange={e => setDecision(e.target.value as 'hold' | 'escalate' | 'retry-unstarted' | 'confirm-completion')} disabled={busy}><option value="hold">Keep blocked</option><option value="escalate">Escalate for investigation</option>{evidence.retryBlock === null && <option value="retry-unstarted">Authorize retry of unstarted work</option>}{evidence.completionBlock === null && <option value="confirm-completion">Confirm saved Council completion</option>}</select>
      <label htmlFor={'review-'+claimId}>Evidence reviewed and next investigation</label>
      <textarea id={'review-'+claimId} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} disabled={busy} rows={3} />
      <p>{decision === 'confirm-completion' ? 'Confirm only the already-saved final outcome. This does not start inference or advance the workflow.' : decision === 'retry-unstarted' ? 'This retires the old claim and schedules the runner. Provider inference may start within the original approved scope and deadline.' : 'Record what the evidence establishes and what remains unknown. Saving this review preserves the reservation.'}</p>
      {evidence.retryBlock && <p>Retry unavailable: {evidence.retryBlock}</p>}
      <button className="secondary-button" disabled={busy || note.trim().length < 20 || (decision === 'retry-unstarted' && evidence.retryBlock !== null) || (decision === 'confirm-completion' && evidence.completionBlock !== null)} onClick={() => void save()}>{busy ? 'Saving decision…' : decision === 'retry-unstarted' ? 'Authorize unstarted retry' : decision === 'confirm-completion' ? 'Confirm saved completion' : 'Record recovery decision'}</button>
    </> : <p>Work is active. A recovery decision becomes available only when its claim is uncertain.</p>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </div>
}
