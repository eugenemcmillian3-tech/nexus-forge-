import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { WorkspaceLayout } from '../components/workspace-layout'
import { useActiveMission } from '../hooks/use-active-mission'

export const Route = createFileRoute('/evidence')({ component: EvidencePage })

function EvidencePage() {
  const { missionId, mission, councilComplete, research } = useActiveMission()
  const search = useAction(api.research.search)
  const [query, setQuery] = useState('current market opportunities for small AI products')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState('')
  const [error, setError] = useState('')
  const runSearch = async () => {
    if (!missionId || !query.trim() || !councilComplete) return
    setBusy(true); setError(''); setReceipt('')
    try { const result = await search({ missionId, query: query.trim(), deepResearch: false }); setReceipt(`Research saved with ${result.citations.length} cited source(s). ${result.result}`) }
    catch (e) { setError(e instanceof Error ? e.message : 'Research failed.') } finally { setBusy(false) }
  }
  const allowed = !!missionId && !!mission?.approved && councilComplete
  return <WorkspaceLayout title="Research & Memory" eyebrow="STAGE 03 / EVIDENCE & LEARNING">
    <section className="workspace"><div className="glass-card research-card"><div className="panel-title"><span>RESEARCH ORACLE</span><span className={allowed ? 'live-pill' : 'status-chip'}>{allowed ? 'READY' : 'WAITING FOR COUNCIL'}</span></div>
      {!missionId ? <><h3>No active mission</h3><Link className="primary-button" to="/mission">Select a mission →</Link></> : !mission?.approved ? <><h3>Mission approval required</h3><Link className="primary-button" to="/mission">Review mission →</Link></> : !councilComplete ? <><h3>Research is next, but the Council is not complete</h3><p>Finish the plan and resolve any blocked agents before gathering mission-specific evidence.</p><Link className="primary-button" to="/council">Review Council →</Link></> : <>
        <label htmlFor="research-query">RESEARCH QUESTION</label><textarea id="research-query" rows={3} value={query} onChange={e => setQuery(e.target.value)} />
        <button className="primary-button" disabled={busy || !query.trim()} onClick={() => void runSearch()}>{busy ? 'Researching…' : 'Run cited research ↗'}</button>
      </>}
    </div>
    {error && <p className="warning" role="alert">{error}</p>}{receipt && <div className="glass-card research-card" role="status"><strong>Research receipt</strong><p>{receipt}</p></div>}
    <div className="glass-card research-card"><div className="panel-title"><span>PERSISTED RESEARCH</span><span className="live-pill">{research.length} RECORDS</span></div>
      {research.length === 0 ? <div className="empty-state"><h3>No evidence stored for this mission</h3><p>Run a research query after Council planning completes.</p></div> : research.map((row: any) => <article className="evidence-item" key={row._id}><span className="time">SOURCE</span><div><b>{row.query}</b><p>{row.result}</p>{(row.citations ?? []).map((citation: string, index: number) => <p key={index}><a href={citation} target="_blank" rel="noreferrer">{citation}</a></p>)}</div></article>)}
    </div>
    <div className="glass-card research-card"><div className="panel-title"><span>MEMORY & LESSONS</span><span className="live-pill">PERSISTENT</span></div><p>Council summaries and verified outcomes are stored as reusable mission memory. Memory is advisory and never grants approval or execution authority.</p><Link className="secondary-button" to="/workflow">Open workflow & outcome records →</Link></div>
    <div className="hero-actions"><Link className="secondary-button" to="/artifacts">Continue to Artifact Forge →</Link></div></section>
  </WorkspaceLayout>
}
