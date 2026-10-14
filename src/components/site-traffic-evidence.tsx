import { useAction, usePaginatedQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function SiteTrafficEvidence({ missionId }: { missionId: Id<'missions'> | null }) {
  const retrieve = useAction(api.siteTraffic.retrieveAndSave)
  const { results, status, loadMore } = usePaginatedQuery(api.verification.siteTrafficHistory, {}, { initialNumItems: 5 })
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [acknowledge, setAcknowledge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const save = async () => {
    if (!missionId) return
    setBusy(true); setError(''); setMessage('')
    try {
      const id = await retrieve({ missionId, periodStart: new Date(start).getTime(), periodEnd: new Date(end).getTime(), acknowledgeSiteScope: acknowledge })
      setMessage('Saved directly retrieved site traffic receipt · ' + id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not retrieve analytics. Review the period and managed connection, then retry.') }
    finally { setBusy(false) }
  }
  return <div className="glass-card research-card" id="site-traffic-evidence">
    <div className="panel-title"><span>DIRECT SITE TRAFFIC EVIDENCE</span><span className="live-pill">MACALY ANALYTICS</span></div>
    <p>Retrieve aggregate traffic for bphntw8kdojl9qvuifywyjtk.macaly.app through its managed analytics connection. These counts cover the entire NEXUS FORGE website. Visitors are not authenticated active users or paying customers, and traffic is not attributed to a mission or another deployed product.</p>
    {!missionId ? <Link className="secondary-button" to="/mission">Select a mission as review context →</Link> : <details><summary>Retrieve and save a completed traffic period</summary><form onSubmit={event => { event.preventDefault(); void save() }}>
      <div className="field-grid"><div><label htmlFor="traffic-start">TRAFFIC PERIOD START · LOCAL TIME</label><input id="traffic-start" type="datetime-local" required value={start} onChange={event => setStart(event.target.value)} /></div><div><label htmlFor="traffic-end">TRAFFIC PERIOD END · LOCAL TIME</label><input id="traffic-end" type="datetime-local" required value={end} onChange={event => setEnd(event.target.value)} /></div></div>
      <p className="muted-copy">Choose a completed period up to 90 days. The selected mission is stored as review context only.</p>
      <label><input type="checkbox" checked={acknowledge} onChange={event => setAcknowledge(event.target.checked)} /> I understand this is site-wide NEXUS FORGE traffic, not mission-attributed product results.</label>
      <button className="secondary-button" disabled={busy || !start || !end || !acknowledge}>{busy ? 'Retrieving site analytics…' : 'Retrieve & save site traffic evidence'}</button>
    </form></details>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <h3>Saved traffic receipts</h3>
    <div aria-live="polite" aria-busy={status === 'LoadingFirstPage' || status === 'LoadingMore'}>
      {status === 'LoadingFirstPage' ? <p>Loading private traffic receipts…</p> : results.length === 0 ? <p>No direct traffic receipt saved yet. Missing analytics is not a zero or a pass.</p> : results.map(row => <article className="evidence-item" key={row._id}><div>
        <b>{row.siteId}</b><p>{row.metrics.visitors} visitors · {row.metrics.visits} visits · {row.metrics.pageviews} pageviews</p>
        <p>{new Date(row.periodStart).toLocaleString()} → {new Date(row.periodEnd).toLocaleString()}</p>
        <p>Retrieved {new Date(row.retrievedAt).toLocaleString()} · Source: {row.source}</p>
        <p className="muted-copy">Review context: {row.missionId}. Site-wide analytics; provider counting rules and bot filtering apply. This does not establish adoption, revenue, mission success or causation.</p>
        <details><summary>Inspect exact source response and receipt</summary><p>Receipt: {row._id} · SHA-256: {row.reportSha256}</p>{typeof row.metrics.bounceRate === 'number' && <p>Reported bounce rate: {(row.metrics.bounceRate * 100).toFixed(1)}%</p>}{typeof row.metrics.visitDuration === 'number' && <p>Reported visit duration: {row.metrics.visitDuration}</p>}<pre className="whitespace-pre-wrap break-words">{row.rawResponse}</pre></details>
      </div></article>)}
      {status === 'CanLoadMore' && <button className="secondary-button" onClick={() => loadMore(5)}>Load more traffic receipts</button>}{status === 'LoadingMore' && <p>Loading more traffic receipts…</p>}
    </div>
    <p className="muted-copy">Identical period/response saves reuse their private receipt. Changed provider responses remain separate snapshots. Traffic receipts are separate from product observations and do not complete missions or promote strategies.</p>
    <Link className="secondary-button" to="/learning">Continue to evidence-led learning review →</Link>
  </div>
}
