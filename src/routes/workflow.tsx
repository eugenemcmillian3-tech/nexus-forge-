import { createFileRoute, Link } from '@tanstack/react-router'
import { MissionControl } from '../components/mission-control'
import { WorkspaceLayout } from '../components/workspace-layout'
import { useActiveMission } from '../hooks/use-active-mission'

export const Route = createFileRoute('/workflow')({ component: WorkflowPage })

export function WorkflowPage() {
  const { missionId, mission, agents, research, artifacts, deliveries } = useActiveMission()
  const stages = [
    { title: '01 · Define & approve mission', done: !!mission?.approved, path: '/mission', note: 'A saved mission contract and explicit operator approval are required.' },
    { title: '02 · Run the AI Council', done: agents.length > 0 && agents.every(row => row.status === 'complete'), path: '/council', note: 'All required agent runs must complete without unresolved blockers.' },
    { title: '03 · Gather cited research', done: research.length > 0, path: '/evidence', note: 'Research records must be persisted against this mission.' },
    { title: '04 · Generate, verify & approve artifact', done: artifacts.some(row => row.status === 'ready'), path: '/artifacts', note: 'Verification and human artifact approval are separate gates.' },
    { title: '05 · Verify production delivery', done: deliveries.some(row => row.stage === 'verified' && row.readinessStatus === 'pass' && typeof row.readinessTotalCount === 'number' && row.readinessTotalCount > 0 && row.readinessPassedCount === row.readinessTotalCount && !!row.workflowRunUrl && !!row.workflowCommitSha && !!row.deploymentRunUrl && row.deploymentCommitSha?.toLowerCase() === row.workflowCommitSha?.toLowerCase() && !!row.deploymentUrl), path: '/delivery', note: 'Requires matching workflow and deployment provenance plus a passing canonical readiness result; a successful build alone is not completion.' },
  ]
  const nextStage = stages.find(stage => !stage.done)
  return <WorkspaceLayout title="Autonomous Workflow" eyebrow="OPERATIONS / SEQUENCE, RECOVERY & OUTCOMES">
    <section className="workspace"><div className="glass-card research-card"><div className="panel-title"><span>SEQUENCE CONTROL</span><span className="live-pill">{stages.filter(s => s.done).length}/{stages.length} STAGES</span></div>
      {missionId && <div className="guard-item" data-testid="workflow-next-step"><span>{nextStage ? '→' : '✓'}</span><div><strong>{nextStage ? `NEXT STEP · ${nextStage.title}` : 'ALL WORKFLOW STAGES VERIFIED'}</strong><small>{nextStage ? nextStage.note : 'Review measured outcomes and portfolio learning before choosing the next mission.'}</small></div><Link className="primary-button" to={nextStage?.path ?? '/portfolio'}>{nextStage ? 'Continue this stage →' : 'Review portfolio →'}</Link></div>}
      {!missionId ? <><h3>No active mission selected</h3><p>Select a mission to show live stage state and outcome evidence.</p><Link className="primary-button" to="/mission">Open Mission Console →</Link></> : <><h3>{mission?.title ?? 'Loading active mission…'}</h3><p>{mission?.mission}</p>{stages.map((stage, index) => <div className="guard-item" key={stage.title}><span>{stage.done ? '✓' : index + 1}</span><div><strong>{stage.title}</strong><small>{stage.note}</small></div><span className="status-chip">{stage.done ? 'DONE' : 'PENDING'}</span><Link className="ghost-button" to={stage.path}>Open page →</Link></div>)}</>}
    </div>
    <div className="glass-card research-card"><div className="panel-title"><span>RUNNER & OUTCOME CONTROL</span><span className="live-pill">PERSISTED EVIDENCE</span></div><p>The runner and outcome controls below reflect persisted Convex records. A timed-out or blocked run remains in human review; this screen does not silently approve, resume, or dispatch external work.</p>{missionId ? <MissionControl missionId={missionId} /> : <p>Select a mission to load its execution, incident, and outcome details.</p>}</div>
    <div className="hero-actions"><Link className="secondary-button" to="/portfolio">Review portfolio decisions →</Link></div></section>
  </WorkspaceLayout>
}
