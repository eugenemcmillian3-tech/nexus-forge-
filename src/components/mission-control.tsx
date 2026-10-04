import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'

export function MissionControl({ missionId }: { missionId: Id<'missions'> | null }) {
  const mission = useQuery(api.missions.getById, missionId ? { id: missionId } : 'skip')
  const incidents = useQuery(api.incidents.list, missionId ? { missionId } : 'skip')
  const verifications = useQuery(api.verification.list, missionId ? { missionId } : 'skip')
  const decision = useQuery(api.portfolio.decisionSnapshot)
  const learning = useQuery(api.portfolio.learningSnapshot)
  const decisions = useQuery(api.portfolio.listDecisions, missionId ? { missionId } : 'skip')
  const recordDecision = useMutation(api.portfolio.recordDecision)
  const approveMission = useMutation(api.missions.approve)
  const executeApprovedMission = useMutation(api.portfolio.executeApprovedMission)
  const [busy, setBusy] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const openIncidents = incidents?.filter(i => i.status === 'open').length ?? 0
  const escalated = incidents?.filter(i => i.status === 'escalated').length ?? 0
  const resolved = incidents?.filter(i => i.status === 'resolved').length ?? 0
  const latest = verifications?.[0]
  const approved = decisions?.find(d => d.decision === 'approve' && d.action === 'Execute approved mission')

  async function authorizeExecution() {
    if (!missionId) return
    setBusy('1:Execute approved mission'); setReceipt(null)
    try { await recordDecision({ missionId, priorityRank: 1, action: 'Execute approved mission', decision: 'approve' }); setReceipt('Execution authorization recorded.') }
    finally { setBusy(null) }
  }
  async function execute() {
    if (!missionId || !approved) return
    setBusy('execute'); setReceipt(null)
    try {
      const confirmed = window.confirm(`Execute approved mission?\n\n${approved.action}\n\nThis starts the bounded 20-minute mission runner. Existing approval, retry, delivery, and verification gates remain active.`)
      if (!confirmed) return
      const result = await executeApprovedMission({ missionId, priorityRank: approved.priorityRank, action: approved.action })
      setReceipt(result.alreadyRunning ? `Execution already active · Run ${result.runId}` : `Execution started · Run ${result.runId}`)
    } finally { setBusy(null) }
  }

  return <section className="workspace dark-section">
    <div className="workspace-head"><div><div className="section-kicker">OPERATIONS / 006</div><h2>Mission Control</h2></div><span className="status-chip">● GOVERNED</span></div>
    <div className="glass-card research-card">
      <div className="panel-title"><span>PORTFOLIO DECISION QUEUE</span><span className="live-pill">● HUMAN GATE</span></div>
      {decision ? <>
        <div className="stats-strip compact"><div><strong>{decision.totalMissions}</strong><span>Missions</span></div><div><strong>{Math.round(decision.completionRate * 100)}%</strong><span>Completion</span></div><div><strong>{decision.blocked}</strong><span>Needs review</span></div></div>
        <div className="decision-line"><span>RECOMMENDATION</span><strong>{decision.recommendation.toUpperCase()}</strong></div>
        {decision.priorities.map(p => <div className="guard-item" key={`${p.rank}-${p.action}`}><span>{p.rank}</span><div><strong>{p.action}</strong><small>{p.reason}</small></div><span className="status-chip">ADVISORY</span></div>)}
        {missionId && mission && <div className="glass-card research-card execution-receipt"><div className="panel-title"><span>SELECTED MISSION GATE</span><span className="live-pill">● HUMAN GATE</span></div><p><strong>{mission.title}</strong> · {mission.status.toUpperCase()} · {mission.approved ? 'MISSION APPROVED' : 'MISSION NOT APPROVED'}</p>{!mission.approved ? <button className="secondary-button" onClick={async () => { await approveMission({ id: mission._id, approved: true }); setReceipt('Mission approved. Record the execution authorization below before execution.') }} disabled={busy !== null}>Approve mission for execution</button> : !approved ? <button className="secondary-button" onClick={authorizeExecution} disabled={busy !== null}>{busy === '1:Execute approved mission' ? 'Saving…' : 'Authorize execution'}</button> : <><p><strong>Execution authorization recorded.</strong> Execution is still a separate explicit action.</p><button className="primary-button" onClick={execute} disabled={busy !== null}>{busy === 'execute' ? 'Starting…' : 'Execute Approved Mission'}</button></>}{receipt && <p className="receipt">{receipt}</p>}</div>}
        <p>Recommendations are advisory. Approval records intent; execution requires the explicit action above and remains bounded by the Mission Runner.</p>
      </> : <p>Loading portfolio decision snapshot…</p>}
    </div>

    <div className="glass-card research-card">
      <div className="panel-title"><span>CROSS-MISSION LEARNING</span><span className="live-pill">● VERIFIED SIGNALS</span></div>
      {learning ? <>
        <div className="stats-strip compact"><div><strong>{learning.missionsObserved}</strong><span>Missions observed</span></div><div><strong>{learning.verifiedOutcomes}</strong><span>Verified outcomes</span></div><div><strong>{Math.round(learning.successRate * 100)}%</strong><span>Success rate</span></div><div><strong>{learning.lessonsCaptured}</strong><span>Lessons</span></div></div>
        {learning.patterns.map(p => <div className="guard-item" key={p.label}><span>{p.count}</span><div><strong>{p.label}</strong><small>{p.implication}</small></div></div>)}
        {learning.lessons.length > 0 && <><div className="panel-title"><span>REUSABLE LESSONS</span></div>{learning.lessons.map((lesson, idx) => <div className="evidence-item" key={`${lesson.source}-${idx}`}><span className="time">{Math.round(lesson.confidence * 100)}%</span><div><b>{lesson.value}</b><p>Source: {lesson.source}</p></div></div>)}</>}
        <p>Learning signals inform future prioritization; they do not approve or execute missions.</p>
      </> : <p>Loading verified learning signals…</p>}
    </div>

    {!missionId ? <div className="glass-card research-card"><h3>No mission selected</h3><p>Forge a mission above to populate the operational control plane with live incidents and outcome evidence.</p></div> : <div className="console-grid">
      <div className="glass-card research-card"><div className="panel-title"><span>EXECUTION HEALTH</span><span className="live-pill">● LIVE</span></div><div className="stats-strip compact"><div><strong>{openIncidents}</strong><span>Open incidents</span></div><div><strong>{resolved}</strong><span>Resolved</span></div><div><strong>{escalated}</strong><span>Escalated</span></div></div>{incidents?.slice(0, 5).map(i => <div className="evidence-item" key={i._id}><span className="time">{i.status.toUpperCase()}</span><div><b>{i.stage}</b><p>{i.diagnosis || i.message}</p>{i.proposedRecovery && <small>Recovery: {i.proposedRecovery}</small>}</div><span className={i.status === 'resolved' ? 'score' : 'warning'}>{i.status}</span></div>)}</div>
      <div className="glass-card research-card"><div className="panel-title"><span>OUTCOME VERIFICATION</span><span className="live-pill">● EVIDENCE</span></div>{latest ? <><div className="decision-line"><span>RESULT</span><strong>{latest.passed ? 'PASSED' : 'FAILED'} · {Math.round(latest.score * 100)}%</strong></div><p>{latest.summary}</p>{latest.criteria.map((c, idx) => <div className="guard-item" key={`${c}-${idx}`}><span>✓</span><div><strong>{c}</strong><small>{latest.evidence[idx] || 'Evidence recorded'}</small></div></div>)}</> : <><h3>Awaiting measured outcome</h3><p>Verification evidence appears here only after the governed delivery reaches the verified stage.</p></>}</div>
    </div>}
  </section>
}
