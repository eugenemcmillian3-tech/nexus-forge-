import { usePaginatedQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

function memoryPreview(value: string) {
  try {
    const record = JSON.parse(value)
    if (record && typeof record === 'object') {
      if (typeof record.lesson === 'string') return record.lesson
      if (typeof record.summary === 'string') return record.summary
    }
  } catch { /* Plain-text memories are valid too. */ }
  return value
}

export function MemoryBrowser({ missionId }: { missionId: Id<'missions'> | null }) {
  const [scope, setScope] = useState(missionId ? 'mission' : 'all')
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const selectedMission = scope === 'mission' && missionId ? missionId : null
  const { results, status, loadMore } = usePaginatedQuery(api.memory.browse, {
    ...(selectedMission ? { missionId: selectedMission } : {}),
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
  }, { initialNumItems: 10 })
  const loading = status === 'LoadingFirstPage'
  return <div className="glass-card research-card" id="memory-browser">
    <div className="panel-title"><span>MEMORY & LESSONS</span><span className="live-pill">{loading ? 'LOADING' : results.length + ' LOADED'}</span></div>
    <p>Inspect saved context, Council summaries, and outcome lessons. Search memory content across your own records. Confidence is the stored signal strength, not independent proof; memory never grants approval or execution authority.</p>
    <div className="field-grid">
      <div><label htmlFor="memory-scope">MEMORY SCOPE</label><select id="memory-scope" value={selectedMission ? 'mission' : 'all'} onChange={event => setScope(event.target.value)}><option value="mission" disabled={!missionId}>Selected mission</option><option value="all">All my memories</option></select></div>
      <div><label htmlFor="memory-category">CATEGORY</label><select id="memory-category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option><option value="lesson">Council summaries</option><option value="research-synthesis">Research syntheses</option><option value="learning-lesson">Learning lessons</option><option value="verification-outcome">Verification outcomes</option><option value="operational-recovery">Operational recovery</option></select></div>
    </div>
    <form onSubmit={event => { event.preventDefault(); setSearch(draft.trim()) }}>
      <label htmlFor="memory-search">SEARCH MEMORY CONTENT</label><input id="memory-search" value={draft} onChange={event => setDraft(event.target.value)} maxLength={200} placeholder="Search saved findings or lessons…" />
      <div className="hero-actions"><button className="secondary-button" type="submit">Search memories</button>{(search || draft) && <button className="ghost-button" type="button" onClick={() => { setDraft(''); setSearch('') }}>Clear search</button>}</div>
    </form>
    <p className="muted-copy">{search ? 'Content search uses matching words and relevance order.' : 'Browsing newest records first.'} {selectedMission ? 'Only memories linked to the selected mission are shown.' : 'Includes your memories from other missions and records without a mission link.'} Loaded counts are not the total size of your memory history.</p>
    <div aria-live="polite" aria-busy={loading || status === 'LoadingMore'}>
      {loading ? <p role="status">Loading saved memory…</p> : results.length === 0 ? <p>{search || category ? 'No memory matches these filters. Try other words, another category, or all your memories.' : selectedMission ? 'No memory is linked to this mission yet. Council summaries and verified outcome lessons appear here when saved; you can also browse all your memories.' : 'No saved memory yet. Complete planning or record evidence-backed learning to create reusable context.'}</p> : results.map(row => {
        const preview = memoryPreview(row.value)
        return <article className="evidence-item" key={row._id}><span className="time">{Math.round(row.confidence * 100)}%</span><div>
          <b>{row.key}</b><p>{preview.length > 300 ? preview.slice(0, 300) + '…' : preview}</p>
          <p className="muted-copy">{row.category} · Source: {row.source} · {new Date(row._creationTime).toLocaleString()}</p>
          <p className="muted-copy">{row.missionId ? 'Linked mission: ' + row.missionId : 'No mission link'} · Receipt: {row._id}</p>
          <details><summary>Inspect complete saved memory</summary><pre className="whitespace-pre-wrap break-words">{row.value}</pre></details>
        </div></article>
      })}
      {status === 'CanLoadMore' && <button className="secondary-button" type="button" onClick={() => loadMore(10)}>Load more memory</button>}
      {status === 'LoadingMore' && <p role="status">Loading more memory…</p>}
    </div>
    <div className="hero-actions"><Link className="secondary-button" to="/learning">Review learning evidence →</Link><Link className="secondary-button" to="/workflow">Open workflow & outcome records →</Link></div>
  </div>
}
