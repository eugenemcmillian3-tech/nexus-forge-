import { useState } from 'react'
import { usePaginatedQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useActiveMission } from '../hooks/use-active-mission'

export function ProviderUsageLedger() {
  const { missionId } = useActiveMission()
  const [scope, setScope] = useState('mission')
  const scoped = scope === 'mission' && !!missionId
  const { results, status, loadMore } = usePaginatedQuery(api.providerUsage.history, scoped ? { missionId: missionId as Id<'missions'> } : {}, { initialNumItems: 20 })
  const reports = results.flatMap(row => row.reports)
  const priced = reports.filter(report => report.reportedCostUsd !== undefined)
  const subtotal = priced.reduce((sum, report) => sum + report.reportedCostUsd!, 0)
  return <section className="glass-card research-card" id="provider-usage-ledger" data-state={status === 'LoadingFirstPage' ? 'loading' : 'ready'}>
    <div className="panel-title"><span>PROVIDER INVOCATIONS & ACCOUNTING GAPS</span><span className="live-pill">SAVED STAGE RECEIPTS</span></div>
    <label htmlFor="usage-scope">USAGE SCOPE</label><select id="usage-scope" value={missionId ? scope : 'all'} onChange={event => setScope(event.target.value)}><option value="mission" disabled={!missionId}>Selected mission</option><option value="all">All my invocations</option></select>
    <p>{scoped ? 'Selected mission invocations.' : 'All owned invocations, including planning before mission creation.'} Each invocation is recorded before inference. Pending means finalization is not confirmed; it is not a successful accounting receipt.</p>
    <p>{results.length} loaded invocations · {reports.length} stored usage reports · Known reported subtotal: {priced.length ? '$' + subtotal.toFixed(6) : 'Unknown'} ({priced.length}/{reports.length} loaded reports include a charge). Loaded-page figures are not account or invoice totals.</p>
    <p className="muted-copy">Recorded means the observed metadata reports were saved, not that every provider attempt reported its usage. Missing charges remain unknown. Direct calls have no runner ID; pre-mission planning remains unlinked. Historical usage is not backfilled. A pending or gap record never replays inference automatically.</p>
    {status === 'LoadingFirstPage' ? <p>Loading invocation history…</p> : results.length === 0 ? <p>No durable invocations recorded in this scope yet. Future managed calls create these records; this is not zero historical usage.</p> : results.map(row => <article className="evidence-item" key={row._id}><div><strong>{row.stage} · {row.outcome.toUpperCase()} · {row.usageStatus.toUpperCase()}</strong><p>Invocation {row._id} · {new Date(row.startedAt).toLocaleString()} · {row.missionRunId ? 'Runner ' + row.missionRunId : 'Direct / pre-mission invocation; no runner ID'}</p><p>{row.reports.length} saved / {row.observedReports ?? 'unconfirmed'} observed metadata reports</p>{row.reports.map(report => <p key={report.ordinal}>Report {report.ordinal}: {report.provider} / {report.model} · Prompt {report.promptTokens ?? 'unknown'} · Completion {report.completionTokens ?? 'unknown'} · Total {report.totalTokens ?? 'unknown'} tokens · Charge {report.reportedCostUsd === undefined ? 'unknown' : '$' + report.reportedCostUsd.toFixed(6)}</p>)}</div></article>)}
    <button className="secondary-button" type="button" disabled={status !== 'CanLoadMore'} onClick={() => loadMore(20)}>{status === 'LoadingMore' ? 'Loading more…' : 'Load more invocations'}</button>
  </section>
}
