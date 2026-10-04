import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function PortfolioIntelligence({ ownerKey = 'local-workspace', onSelect }: { ownerKey?: string; onSelect: (id: string) => void }) {
  const portfolio = useQuery(api.portfolio.decisionSnapshot)
  const learning = useQuery(api.portfolio.learningSnapshot)
  const missions = useQuery(api.missions.list, { ownerKey, paginationOpts: { numItems: 20, cursor: null } })
  const rows = missions?.page ?? []
  const topSignal = learning?.prioritySignals[0]
  return <section className="workspace portfolio-section">
    <div className="workspace-head"><div><div className="section-kicker">PORTFOLIO INTELLIGENCE / 007</div><h2>Mission History</h2></div><span className="status-chip"><span className="pulse-dot" /> PORTFOLIO LIVE</span></div>
    <div className="stats-strip compact"><div><strong>{portfolio?.totalMissions ?? 0}</strong><span>Missions</span></div><div><strong>{portfolio?.active ?? 0}</strong><span>Active</span></div><div><strong>{portfolio?.blocked ?? 0}</strong><span>Review</span></div><div><strong>{Math.round((portfolio?.completionRate ?? 0) * 100)}%</strong><span>Completion</span></div><div><strong>{portfolio?.recommendation?.toUpperCase() ?? '—'}</strong><span>Recommendation</span></div></div>
    {learning && <div className="glass-card research-card"><div className="panel-title"><span>LEARNING-AWARE PRIORITIZATION</span><span className="live-pill">● ADVISORY</span></div><div className="decision-line"><span>TOP SIGNAL</span><strong>{topSignal?.signal ?? 'Insufficient verified history'}</strong></div><p>{topSignal?.implication ?? 'Verified outcomes will inform future ranking once sufficient evidence exists.'}</p><div className="stats-strip compact"><div><strong>{Math.round(learning.successRate * 100)}%</strong><span>Verified success</span></div><div><strong>{learning.verifiedOutcomes}</strong><span>Verified outcomes</span></div><div><strong>{learning.lessonsCaptured}</strong><span>Lessons</span></div><div><strong>{learning.prioritySignals.length}</strong><span>Priority signals</span></div></div></div>}
    <div className="glass-card research-card portfolio-table">
      {!portfolio || !missions ? <p>Loading portfolio intelligence…</p> : rows.length === 0 ? <div className="empty-state"><h3>No missions yet</h3><p>Forge your first mission and this view will become the portfolio-level source of truth.</p></div> : <>
        <div className="decision-line"><span>PORTFOLIO RATIONALE</span><strong>{portfolio.rationale[0] ?? 'No additional rationale.'}</strong></div>
        {rows.map(row => <button className="portfolio-row" key={row._id} onClick={() => onSelect(row._id)}><div className="portfolio-main"><strong>{row.title}</strong><p>{row.mission}</p></div><div className="portfolio-cell"><small>STATUS</small><b>{row.status.toUpperCase()}</b></div><div className="portfolio-cell"><small>PROGRESS</small><b>{row.completion}%</b></div><div className="portfolio-cell"><small>AUTONOMY</small><b>{row.autonomy.toUpperCase()}</b></div><div className="portfolio-cell"><small>APPROVAL</small><b>{row.approved ? 'APPROVED' : 'PENDING'}</b></div></button>)}
      </>}
    </div>
  </section>
}
