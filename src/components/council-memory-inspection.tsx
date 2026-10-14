import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

function EvaluateSelection({ receiptId, selectedIds, candidateAvailable }: { receiptId: Id<'councilMemoryReceipts'>; selectedIds: Id<'memories'>[]; candidateAvailable: boolean }) {
  const evaluate = useMutation(api.memory.evaluateCouncilMemory)
  const compare = useMutation(api.memory.compareCouncilMemoryPolicy)
  const comparisons = useQuery(api.memory.councilPolicyComparisons, candidateAvailable ? { receiptId } : 'skip')
  const history = useQuery(api.memory.councilMemoryEvaluations, { receiptId })
  const [expected, setExpected] = useState(''), [rationale, setRationale] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const save = async () => {
    setBusy(true); setError(''); setMessage('')
    try { const id = await evaluate({ receiptId, expectedIds: expected.split(/\s+/).filter(Boolean) as Id<'memories'>[], rationale: rationale.trim() }); setMessage('Saved Council selection evaluation · ' + id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not evaluate this selection. Review expected memory receipts and retry.') }
    finally { setBusy(false) }
  }
  const compareSaved = async (evaluationId: Id<'councilMemoryEvaluations'>) => {
    setBusy(true); setError(''); setMessage('')
    try { const id = await compare({ evaluationId }); setMessage('Saved policy comparison · ' + id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not compare captured policies. Retry after reviewing the label receipt.') }
    finally { setBusy(false) }
  }
  return <details><summary>Evaluate this captured selection</summary>
    <p>Identify relevant learning lessons, verification outcomes or recovery memories that existed in the captured corpus. Copy IDs from Research &amp; Memory. Labels are operator judgments, not independent proof of relevance or use by the model.</p>
    <form onSubmit={event => { event.preventDefault(); void save() }}>
      <label htmlFor={'expected-' + receiptId}>EXPECTED MEMORY RECEIPTS · ONE PER LINE · 1–20</label><textarea id={'expected-' + receiptId} required rows={3} maxLength={1200} value={expected} onChange={event => setExpected(event.target.value)} />
      <label htmlFor={'rationale-' + receiptId}>WHY THESE MEMORIES ARE RELEVANT</label><textarea id={'rationale-' + receiptId} required minLength={8} maxLength={1200} rows={2} value={rationale} onChange={event => setRationale(event.target.value)} />
      <button className="secondary-button" disabled={busy || !expected.trim() || rationale.trim().length < 8}>{busy ? 'Saving selection evaluation…' : 'Score captured Council memory selection'}</button>
    </form>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <p className="muted-copy">Precision = labeled relevant selected IDs / unique selected IDs. Recall = selected relevant IDs / expected IDs. Multiple prompt channels count each memory once. No reciprocal-rank score is assigned to these separate context channels.</p>
    {history === undefined ? <p>Loading evaluations…</p> : history.length === 0 ? <p>No relevance evaluation saved for this context yet.</p> : history.map(row => <div key={row._id}><p>{row.hits} relevant hits / {row.selectedCount} selected · Precision {(row.precision * 100).toFixed(0)}% · Recall {(row.recall * 100).toFixed(0)}% · {row.rationale} · {new Date(row.recordedAt).toLocaleString()}</p><p>Expected IDs: {row.expectedIds.join(', ')}</p><p>Missed expected IDs: {row.expectedIds.filter(id => !selectedIds.includes(id)).join(', ') || 'None under these labels'}</p>{candidateAvailable && <button type="button" className="secondary-button" disabled={busy} onClick={() => void compareSaved(row._id)}>Compare candidate using these saved labels</button>}</div>)}
    {candidateAvailable ? <><h4>Saved policy comparisons</h4><p className="muted-copy">Both selections use the same captured source window, unique-memory budget and expected IDs. Lexical matching is experimental and has never replaced the planner's context.</p>{comparisons === undefined ? <p>Loading comparisons…</p> : comparisons.length === 0 ? <p>No candidate comparison saved for this receipt yet. Save relevance labels above, then compare using those labels.</p> : comparisons.map(item => <div key={item._id}><p>Label receipt: {item.evaluationId} · {item.expectedIds.length} expected memories</p><table><thead><tr><th>Policy</th><th>Hits / selected</th><th>Precision</th><th>Recall</th></tr></thead><tbody><tr><td>Current captured policy</td><td>{item.baseline.hits} / {item.baseline.selectedCount}</td><td>{(item.baseline.precision * 100).toFixed(1)}%</td><td>{(item.baseline.recall * 100).toFixed(1)}%</td></tr><tr><td>Lexical candidate</td><td>{item.candidate.hits} / {item.candidate.selectedCount}</td><td>{(item.candidate.precision * 100).toFixed(1)}%</td><td>{(item.candidate.recall * 100).toFixed(1)}%</td></tr></tbody></table><p>Candidate minus current: precision {(item.precisionDelta * 100).toFixed(1)} percentage points · recall {(item.recallDelta * 100).toFixed(1)} percentage points</p><p>Comparison receipt: {item._id} · {new Date(item.recordedAt).toLocaleString()}</p></div>)}</> : <p className="muted-copy">No candidate was captured for this historical receipt. Candidate comparisons become available on future planning attempts; current data will not be substituted for missing history.</p>}
  </details>
}

export function CouncilMemoryInspection({ missionId }: { missionId: Id<'missions'> }) {
  const history = useQuery(api.memory.councilMemoryHistory, { missionId })
  return <div className="glass-card research-card" id="council-memory-selection">
    <div className="panel-title"><span>CAPTURED COUNCIL MEMORY SELECTION</span><span className="live-pill">ACTUAL CONTEXT RECEIPTS</span></div>
    <p>Future planner attempts retain selected memory IDs and the exact rendered learning/preflight context. Selection follows the existing newest-60 learning and newest-80 adaptive windows. This is separate from memory-browser search evaluation; research evidence is retrieved separately.</p>
    <p className="muted-copy">Prepared means context was saved before the planner attempt. Planner responded means a response returned; it does not prove the model attended to every memory, completed Council planning or used a lesson correctly. Older runs cannot be reconstructed as exact historical receipts.</p>
    {history === undefined ? <p>Loading captured context…</p> : history.length === 0 ? <p>No captured context for this mission yet. A future explicit planning attempt will create a receipt; opening this panel does not run planning.</p> : history.map(row => <article className="evidence-item" key={row._id}><div>
      <b>{row.status === 'planner-responded' ? 'Planner responded' : 'Prepared · no planner response confirmed'} · {row.selected.length} unique selected memories</b>
      <p>{row.policyVersion} · {new Date(row.preparedAt).toLocaleString()} · Receipt {row._id}</p>
      <details><summary>Inspect selected IDs, channels and rendered context</summary>
        {row.selected.length === 0 ? <p>No memory was selected; this is not a relevance pass.</p> : row.selected.map(item => <div key={item.memoryId}><strong>{item.key}</strong><p>Receipt {item.memoryId} · {item.category} · {item.source} · Routes: {item.routes.join(', ')}</p><pre className="whitespace-pre-wrap break-words">{item.learningValue ?? item.value}</pre></div>)}
        <h4>Saved mission input</h4><pre className="whitespace-pre-wrap break-words">{row.missionText}</pre>
        <h4>Exact learning context</h4><pre className="whitespace-pre-wrap break-words">{row.learningContext}</pre>
        <h4>Exact adaptive preflight context</h4><pre className="whitespace-pre-wrap break-words">{row.preflightContext}</pre>
      </details>
      {row.candidate && <details><summary>Inspect advisory candidate selection · not sent to Council</summary><p>{row.candidate.policyVersion} · Budget {row.candidate.budget} · Terms: {row.candidate.missionTerms.join(', ') || 'No indexed mission terms; recency tie-breaking only'}</p><p>Distinct mission-term overlap ranks eligible memories in the same newest-80 source window, with recency then ID tie-breaking. At most 40 mission terms are used. This is a shadow candidate, not live planning context.</p>{row.candidate.selected.length === 0 ? <p>Candidate selected no memories under this budget.</p> : row.candidate.selected.map(item => <div key={item.memoryId}><strong>{item.key}</strong><p>Receipt {item.memoryId} · {item.category} · {item.source}</p><pre className="whitespace-pre-wrap break-words">{item.value}</pre></div>)}</details>}
      <EvaluateSelection receiptId={row._id} selectedIds={row.selected.map(item => item.memoryId)} candidateAvailable={!!row.candidate} />
    </div></article>)}
    <p className="muted-copy">Latest 10 context receipts and latest 20 evaluations per receipt. Captured text stays immutable; relevance labels are separate saved observations. Candidate comparisons reuse saved relevance labels and never change live selection policy, mission approval or completion.</p>
    <Link className="secondary-button" to="/evidence">Inspect saved memory receipts in Research &amp; Memory →</Link>
  </div>
}
