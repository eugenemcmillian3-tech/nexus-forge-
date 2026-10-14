import { useAction, useQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type Lesson = { id: string; key: string; excerpt: string; source: string; strategyId: string | null }
type Score = { returned: number; hits: number; precisionAt5: number; recallAt5: number; reciprocalRank: number; results: Lesson[] }
type Receipt = { version: string; search: string; missionId: string | null; rationale: string; expected: Lesson[]; baseline: Score; candidate: Score; recordedAt: number }

export function MemoryRetrievalEvaluation({ missionId }: { missionId: Id<'missions'> | null }) {
  const evaluate = useAction(api.memory.evaluateRetrieval)
  const history = useQuery(api.memory.retrievalEvaluations, {})
  const [search, setSearch] = useState('')
  const [expected, setExpected] = useState('')
  const [rationale, setRationale] = useState('')
  const [scope, setScope] = useState('all')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const run = async () => {
    setBusy(true); setError(''); setMessage('')
    try {
      const id = await evaluate({ search: search.trim(), expectedIds: expected.split(/\s+/).filter(Boolean) as Id<'memories'>[], rationale: rationale.trim(), ...(scope === 'mission' && missionId ? { missionId } : {}) })
      setMessage('Saved retrieval comparison · ' + id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save retrieval comparison. Review the lesson receipts and retry.') }
    finally { setBusy(false) }
  }
  return <div className="glass-card research-card" id="memory-retrieval-evaluation">
    <div className="panel-title"><span>LESSON RETRIEVAL EVALUATION</span><span className="live-pill">TOP 5 · OPERATOR LABELS</span></div>
    <p>Before running a search, identify the learning lessons that should answer your question. Copy their receipt IDs from Memory &amp; Lessons above. The server compares relevance-ranked content search with the five newest lessons in the same private scope.</p>
    <p className="muted-copy">This evaluates memory-browser retrieval. Council planning currently uses a separate recent-history window. Linked strategy IDs provide traceability; scores do not prove strategy reuse improved an outcome.</p>
    <form onSubmit={event => { event.preventDefault(); void run() }}>
      <label htmlFor="retrieval-question">SEARCH QUESTION</label><input id="retrieval-question" required maxLength={200} value={search} onChange={event => setSearch(event.target.value)} />
      <label htmlFor="retrieval-scope">EVALUATION SCOPE</label><select id="retrieval-scope" value={scope} onChange={event => setScope(event.target.value)}><option value="all">All my learning lessons</option><option value="mission" disabled={!missionId}>Selected mission's learning lessons</option></select>
      <label htmlFor="retrieval-expected">EXPECTED RELEVANT LESSON RECEIPTS · ONE PER LINE · 1–20</label><textarea id="retrieval-expected" required rows={3} maxLength={1200} value={expected} onChange={event => setExpected(event.target.value)} />
      <label htmlFor="retrieval-rationale">WHY THESE LESSONS ARE RELEVANT</label><textarea id="retrieval-rationale" required minLength={8} maxLength={1200} rows={2} value={rationale} onChange={event => setRationale(event.target.value)} />
      <button className="secondary-button" disabled={busy || !search.trim() || !expected.trim() || rationale.trim().length < 8}>{busy ? 'Measuring retrieval…' : 'Run & save retrieval comparison'}</button>
    </form>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <p className="muted-copy">Precision@5 = relevant hits / 5 (empty slots count as misses). Recall@5 = hits / expected lessons. Reciprocal rank = 1 / first relevant rank, or 0 if none. Relevance labels are operator-selected and may be incomplete. History shows the latest 20 saved comparisons across your scopes; each receipt retains its scope.</p>
    <h3>Saved retrieval comparisons</h3>
    {history === undefined ? <p>Loading retrieval evaluations…</p> : history.length === 0 ? <p>No retrieval evaluations recorded yet. Missing evidence is not a pass.</p> : history.map(row => {
      let record: Receipt
      try { record = JSON.parse(row.value) as Receipt; if (record.version !== 'lesson-retrieval-v1' || !record.baseline || !record.candidate) throw new Error('Unknown format') }
      catch { return <p key={row._id}>Evaluation receipt {row._id} could not be displayed.</p> }
      return <article className="evidence-item" key={row._id}><div>
        <b>{record.search}</b><p>{record.missionId ? 'Mission: ' + record.missionId : 'All owned learning lessons'} · {new Date(record.recordedAt).toLocaleString()}</p>
        <p>{record.rationale}</p>
        <table><thead><tr><th>Method</th><th>Hits / returned</th><th>Precision@5</th><th>Recall@5</th><th>Reciprocal rank</th></tr></thead><tbody>{([['Newest five', record.baseline], ['Content search', record.candidate]] as const).map(([label, score]) => <tr key={label}><td>{label}</td><td>{score.hits} / {score.returned}</td><td>{(score.precisionAt5 * 100).toFixed(0)}%</td><td>{(score.recallAt5 * 100).toFixed(0)}%</td><td>{score.reciprocalRank.toFixed(2)}</td></tr>)}</tbody></table>
        <details><summary>Inspect expected lessons and observed rankings</summary><p>Expected: {record.expected.map(lesson => lesson.id).join(', ')}</p>{([['Newest five', record.baseline], ['Content search', record.candidate]] as const).map(([label, score]) => <div key={label}><strong>{label}</strong>{score.results.length === 0 ? <p>No results returned.</p> : <ol>{score.results.map(lesson => <li key={lesson.id}>{lesson.key} · Receipt {lesson.id}{lesson.strategyId && <p>Linked strategy receipt: {lesson.strategyId}</p>}<p>{lesson.excerpt}</p></li>)}</ol>}</div>)}<p>Receipt: {row._id} · Excerpts retain up to 500 characters from the observed snapshot.</p></details>
      </div></article>
    })}
    <Link className="secondary-button" to="/learning">Continue to measured learning &amp; strategy comparisons →</Link>
  </div>
}
