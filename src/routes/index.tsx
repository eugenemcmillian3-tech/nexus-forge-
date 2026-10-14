import { createFileRoute, Link } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'
import { useActiveMission } from '../hooks/use-active-mission'
import { useMissionGuide } from '../lib/use-mission-guide'
import { guidedWorkspaces } from '../lib/workspaces'

export const Route = createFileRoute('/')({ component: OverviewPage })

export function OverviewPage() {
  const { missionId, mission, agents, research, artifacts, deliveries, councilComplete } = useActiveMission()
  const { nextStage } = useMissionGuide()
  const hasArtifact = artifacts.length > 0
  const hasVerified = artifacts.some(row => row.status === 'verified' || row.status === 'ready')
  const hasArtifactApproval = artifacts.some(row => row.status === 'ready')
  const hasDeliveryPrepared = deliveries.length > 0
  const hasDeliveryApproval = deliveries.some(row => row.approved && ['github', 'test', 'build', 'deploy', 'verified', 'complete'].includes(row.stage))
  const hasBuildEvidence = deliveries.some(row => row.workflowConclusion === 'success' && !!row.workflowRunUrl && !!row.workflowCommitSha && !!row.workflowRecordedAt)
  // Keep Overview's ordered execution aligned with the shared sidebar and guided tour.
  const workspaceEvidence: Record<string, boolean> = {
    '/': false, '/mission': !!missionId, '/roadmap': false, '/council': councilComplete,
    '/manifest': false, '/orchestrator': false, '/evidence': research.length > 0,
    '/artifacts': hasArtifact && hasVerified && hasArtifactApproval,
    '/learning': false, '/capabilities': false,
    '/delivery': hasDeliveryPrepared && hasDeliveryApproval && hasBuildEvidence,
    '/readiness': deliveries.some(row => row.stage === 'verified' && row.readinessStatus === 'pass' && typeof row.readinessTotalCount === 'number' && row.readinessTotalCount > 0 && row.readinessPassedCount === row.readinessTotalCount),
    '/incidents': false, '/workflow': false, '/portfolio': false, '/providers': false,
  }
  const stages = guidedWorkspaces.map((workspace, index) => ({
    title: workspace.title, detail: workspace.purpose,
    done: workspaceEvidence[workspace.path] ?? false, to: workspace.path, index,
  }))
  const next = stages.find(stage => stage.to === nextStage?.path)
  const recorded = stages.filter(stage => stage.done).length
  const progress = Math.round(recorded / stages.length * 100)
  const status = !missionId ? 'Start at Mission Console to create a mission, then follow the ordered workspace tabs.' : !mission?.approved ? 'Mission selected. Continue to Mission Console to review its recorded authorization state.' : !councilComplete ? 'Continue to AI Council and complete planning.' : !research.length ? 'Continue to Research & Memory when cited research is needed.' : !hasArtifactApproval ? 'Continue to Artifact Forge to generate, verify, and review the artifact.' : !hasBuildEvidence ? 'Continue to Delivery Pipeline to inspect delivery and build evidence.' : 'Continue through the remaining workspaces and review measured outcomes.'
  return <WorkspaceLayout title="Mission Overview" eyebrow="NEXUS FORGE / CONTROL TOWER">
    <section className="workspace">
      <div className="hero-grid"><div className="hero-copy"><div className="eyebrow"><span /> GOVERNED INTELLIGENCE OS</div><h2>From intent to <em>verified outcome.</em></h2><p className="hero-text">Every capability has its own page. Mission state is shared across workspaces, and downstream actions remain gated until prerequisites are recorded.</p><div className="hero-actions"><Link className="primary-button" to={missionId ? '/workflow' : '/mission'}>{missionId ? 'Open active workflow' : 'Create first mission'} ↗</Link><Link className="secondary-button" to="/portfolio">Portfolio intelligence →</Link></div></div><div className="glass-card research-card"><div className="panel-title"><span>ACTIVE MISSION</span><span className="live-pill">LIVE STATE</span></div>{mission ? <><h3>{mission.title}</h3><p>{mission.mission}</p><div className="decision-line"><span>MISSION STATUS</span><strong>{mission.status.toUpperCase()}</strong></div><div className="decision-line"><span>HUMAN APPROVAL</span><strong>{mission.approved ? 'APPROVED' : 'PENDING'}</strong></div><div className="decision-line"><span>SPEND CAP</span><strong>${mission.budget}</strong></div></> : <><h3>No active mission</h3><p>Create a mission contract to start the ordered workflow.</p><Link className="primary-button" to="/mission">Open Mission Console →</Link></>}</div></div>
      <div className="stats-strip"><div><strong>{progress}%</strong><span>Workspace stages recorded</span></div><div><strong>{agents.length}</strong><span>Agent runs</span></div><div><strong>{research.length}</strong><span>Research records</span></div><div><strong>{artifacts.length}</strong><span>Artifacts</span></div><div><strong>{deliveries.length}</strong><span>Delivery records</span></div></div>
      <div className="glass-card research-card"><div className="workflow-guide-head"><div><div className="section-kicker">ORDERED EXECUTION</div><h2>Next step</h2><p>{status}</p><p className="muted-copy">All 16 dedicated pages are listed below. Recorded counts reflect available evidence; optional and informational pages may remain unrecorded. Follow the mission recommendation above for required execution.</p></div><div className="workflow-progress"><strong>{recorded}/{stages.length}</strong><span>stages recorded</span></div></div>
        {next ? <div className="workflow-next"><div className="workflow-next-number">{stages.indexOf(next) + 1}</div><div className="workflow-next-copy"><span className="workflow-eyebrow">NEXT MISSION ACTION</span><h3>{next.title}</h3><p>{next.detail}</p></div><Link className="primary-button" to={next.to}>Open stage →</Link></div> : <div className="workflow-next workflow-finished"><div className="workflow-next-number">✓</div><div className="workflow-next-copy"><span className="workflow-eyebrow">EVIDENCE RECORDED</span><h3>All configured stages have evidence</h3><p>Review the measured outcome before declaring mission success.</p></div><Link className="secondary-button" to="/workflow">Review outcome →</Link></div>}
        <div className="workflow-step-list">{stages.map((stage, index) => { const nextStage = stages[index + 1]; return <div className={'workflow-step ' + (stage.done ? 'is-done' : next === stage ? 'is-current' : '')} key={stage.to}><span className="workflow-step-mark">{stage.done ? '✓' : String(index + 1).padStart(2, '0')}</span><span className="workflow-step-copy"><strong>{stage.title}</strong><small>{stage.detail}</small></span><span className="workflow-step-state">{stage.done ? 'RECORDED' : stage.to === '/' ? 'YOU ARE HERE' : next === stage ? 'NEXT' : 'PENDING'}</span><span className="workflow-tour-links"><Link className="primary-button small" to={stage.to}>Open step →</Link>{nextStage ? <Link className="ghost-button" to={nextStage.to}>Next: {nextStage.title} →</Link> : <Link className="ghost-button" to="/workflow">Tour complete · Review guide →</Link>}</span></div> })}</div>
      </div>
      <div className="console-grid"><Link className="glass-card research-card" to="/council"><div className="panel-title"><span>AI COUNCIL</span><span className="live-pill">{agents.length} RUNS</span></div><h3>Planning & execution</h3><p>Inspect agent runs, orchestration status, and blockers.</p></Link><Link className="glass-card research-card" to="/evidence"><div className="panel-title"><span>RESEARCH & MEMORY</span><span className="live-pill">{research.length} RECORDS</span></div><h3>Evidence first</h3><p>Run cited research and inspect stored mission evidence.</p></Link><Link className="glass-card research-card" to="/artifacts"><div className="panel-title"><span>ARTIFACT FORGE</span><span className="live-pill">{artifacts.length} ARTIFACTS</span></div><h3>Create and verify</h3><p>Generate drafts, run quality checks, and record human approval.</p></Link><Link className="glass-card research-card" to="/delivery"><div className="panel-title"><span>DELIVERY PIPELINE</span><span className="live-pill">{deliveries.length} RECORDS</span></div><h3>Build and delivery evidence</h3><p>Explicitly approve external delivery and inspect persisted workflow evidence.</p></Link></div>
    </section>
  </WorkspaceLayout>
}
