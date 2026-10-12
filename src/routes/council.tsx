import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { WorkspaceLayout } from '../components/workspace-layout'
import { useActiveMission } from '../hooks/use-active-mission'

export const Route = createFileRoute('/council')({ component: CouncilPage })

function CouncilPage() {
  const { missionId, mission, agents, councilComplete, hasResearch } = useActiveMission()
  const orchestrate = useAction(api.forge.orchestrate)
  const remember = useMutation(api.memory.remember)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState('')
  const [error, setError] = useState('')
  const [memoryWarning, setMemoryWarning] = useState('')
  const [handoffWarning, setHandoffWarning] = useState('')
  const allowed = !!missionId && !!mission?.approved

  const run = async () => {
    if (!missionId || !mission || !allowed) return
    setBusy(true)
    setReceipt('')
    setError('')
    setMemoryWarning('')
    setHandoffWarning('')
    try {
      const result = await orchestrate({ missionId, mission: mission.mission })
      setReceipt(result.summary)
      if (!result.ok) {
        setHandoffWarning('Council planning returned a partial result because one or more specialist agents were blocked. Review the agent run notes and evidence before continuing to downstream creation or delivery.')
      }
      try {
        await remember({
          ownerKey: mission.ownerKey,
          missionId,
          category: 'lesson',
          key: 'latest-orchestration',
          value: result.summary,
          confidence: result.ok ? 0.9 : 0.5,
          source: 'NEXUS Council',
        })
      } catch (memoryError) {
        setMemoryWarning(`Council planning completed, but the learning memory could not be saved: ${memoryError instanceof Error ? memoryError.message : 'unknown memory error'}. The orchestration receipt is still available above.`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Council orchestration failed.')
    } finally {
      setBusy(false)
    }
  }

  return <WorkspaceLayout title="AI Council Workspace" eyebrow="STAGE 02 / PLAN & ORCHESTRATE">
    <section className="workspace">
      <div className="glass-card research-card">
        <div className="panel-title"><span>EXECUTION GATE</span><span className={allowed ? 'live-pill' : 'status-chip'}>{allowed ? 'MISSION APPROVED' : 'LOCKED'}</span></div>
        {!missionId ? <>
          <h3>Select a mission first</h3>
          <p>Create a mission from the Overview page. Its selection is kept for this browser session.</p>
          <Link className="primary-button" to="/">Open Overview →</Link>
        </> : !mission ? <>
          <h3>Loading mission</h3><p>Checking the selected mission and its access permissions.</p>
        </> : !mission.approved ? <>
          <h3>Mission approval required</h3>
          <p>Planning cannot start until this mission has an explicit human approval record.</p>
          <Link className="primary-button" to="/">Review mission approval →</Link>
        </> : <>
          <h3>{mission.title}</h3>
          <p>{mission.mission}</p>
          <button className="primary-button" onClick={() => void run()} disabled={busy}>{busy ? 'Council is planning…' : 'Execute approved mission planning ↗'}</button>
        </>}
      </div>
      {error && <p className="warning" role="alert">{error}</p>}
      {handoffWarning && <p className="warning" role="alert">{handoffWarning}</p>}
      {memoryWarning && <p className="warning" role="alert">{memoryWarning}</p>}
      {receipt && <div className="glass-card research-card" role="status"><strong>Orchestration receipt</strong><p>{receipt}</p></div>}
      <div className="glass-card research-card">
        <div className="panel-title"><span>AGENT RUNS</span><span className="live-pill">{agents.length} RECORDED</span></div>
        {agents.length === 0 ? <div className="empty-state"><h3>No Council run yet</h3><p>Approve the mission, then explicitly execute planning.</p></div> : agents.map(agent => <div className="guard-item" key={agent._id}>
          <span>{agent.status === 'complete' ? '✓' : agent.status === 'running' ? '◌' : '!'}</span>
          <div><strong>{agent.agent} · {agent.role}</strong><small>{agent.note}</small><small>{agent.progress}% complete</small></div>
          <span className="status-chip">{agent.status.toUpperCase()}</span>
        </div>)}
        {councilComplete ? <p className="receipt">All current agent runs are complete. Research and evidence is the next stage.</p> : agents.length > 0 && <p className="warning">Council is not yet fully complete. Resolve blocked agents before moving to downstream creation.</p>}
      </div>
      <div className="hero-actions">
        <Link className="secondary-button" to="/manifest">{hasResearch ? 'Continue to Manifest Intelligence →' : 'Open Manifest Intelligence →'}</Link>
      </div>
    </section>
  </WorkspaceLayout>
}
