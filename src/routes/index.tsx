import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/')({ component: App })

type Agent = { name: string; role: string; icon: string; state: 'Working' | 'Ready' | 'Guarded'; progress: number; note: string }
const starterAgents: Agent[] = [
  { name: 'Vision Architect', role: 'Mission mapping', icon: '◈', state: 'Working', progress: 78, note: 'Turning intent into measurable outcomes.' },
  { name: 'Research Oracle', role: 'Evidence & market', icon: '◎', state: 'Working', progress: 64, note: 'Comparing current signals and uncertainty.' },
  { name: 'Systems Engineer', role: 'Architecture', icon: '⌘', state: 'Ready', progress: 42, note: 'Stack and data model are staged.' },
  { name: 'Builder Agent', role: 'Code & tests', icon: '▣', state: 'Ready', progress: 31, note: 'Waiting for the architecture gate.' },
  { name: 'Creative Director', role: 'Brand & media', icon: '✦', state: 'Working', progress: 57, note: 'Generating launch directions.' },
  { name: 'Critic Agent', role: 'Verification', icon: '△', state: 'Guarded', progress: 26, note: 'Challenging assumptions before execution.' },
]

function App() {
  const [mission, setMission] = useState('Create a new AI venture that turns creative intent into measurable digital products.')
  const [running, setRunning] = useState(false)
  const [autonomy, setAutonomy] = useState('Approval required')
  const [budget, setBudget] = useState(100)
  const [approved, setApproved] = useState(false)
  const [agents, setAgents] = useState(starterAgents)
  const [evidence, setEvidence] = useState('No orchestration has run yet. Your first run will create persistent evidence in the Forge core.')
  const [missionId, setMissionId] = useState<Id<'missions'> | null>(null)
  const [researchQuery, setResearchQuery] = useState('current market opportunities for small AI products')
  const [researching, setResearching] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [artifactName, setArtifactName] = useState('Mission Blueprint')
  const [githubNote, setGithubNote] = useState('GitHub Actions is the free delivery executor.')
  const [targetRepo, setTargetRepo] = useState('eugenemcmillian3-tech/nexus-forge-')
  const [targetBranch, setTargetBranch] = useState('main')
  const [deliveryBusy, setDeliveryBusy] = useState(false)
  const [syncingDelivery, setSyncingDelivery] = useState<string | null>(null)

  const createMission = useMutation(api.missions.create)
  const approveMission = useMutation(api.missions.approve)
  const orchestrate = useAction(api.forge.orchestrate)
  const search = useAction(api.research.search)
  const generateArtifact = useAction(api.artifacts.generate)
  const remember = useMutation(api.memory.remember)
  const prepareDelivery = useMutation(api.delivery.prepare)
  const approveDelivery = useMutation(api.delivery.approve)
  const advanceDelivery = useMutation(api.delivery.advance)
  const syncGitHubActions = useAction(api.delivery.syncGitHubActions)
  const deliveryRows = useQuery(api.delivery.list, missionId ? { missionId } : 'skip')
  const researchRows = useQuery(api.research.list, missionId ? { missionId } : 'skip')
  const artifactRows = useQuery(api.artifacts.list, missionId ? { missionId } : 'skip')
  const completion = Math.round(agents.reduce((sum, agent) => sum + agent.progress, 0) / agents.length)

  const launchMission = async () => {
    setRunning(true)
    setAgents(current => current.map(agent => ({ ...agent, state: agent.name === 'Critic Agent' ? 'Guarded' : 'Working', progress: Math.min(agent.progress + 8, 96) })))
    try {
      const id = await createMission({ title: 'NEXUS Forge Mission', mission, autonomy, budget, ownerKey: 'local-workspace' })
      setMissionId(id)
      await approveMission({ id, approved: true })
      const result = await orchestrate({ missionId: id, mission })
      setEvidence(result.summary)
      setApproved(true)
      await remember({ ownerKey: 'local-workspace', missionId: id, category: 'lesson', key: 'latest-orchestration', value: result.summary, confidence: 0.9, source: 'NEXUS Council' })
    } catch (error) { setEvidence(error instanceof Error ? error.message : 'The orchestration run could not complete.') }
    finally { setRunning(false) }
  }

  const runResearch = async () => {
    if (!missionId || !researchQuery.trim()) return
    setResearching(true)
    try {
      const result = await search({ missionId, query: researchQuery.trim(), deepResearch: false })
      setEvidence(`Research complete: ${result.citations.length} cited source(s). ${result.result.slice(0, 280)}`)
    } catch (error) { setEvidence(error instanceof Error ? error.message : 'Research failed.') }
    finally { setResearching(false) }
  }

  const forgeArtifact = async () => {
    if (!missionId) return
    setGenerating(true)
    try {
      const result = await generateArtifact({ missionId, mission, artifactType: 'blueprint', artifactName })
      setEvidence(`Artifact created and held for approval: ${result.artifactId}`)
    } catch (error) { setEvidence(error instanceof Error ? error.message : 'Artifact generation failed.') }
    finally { setGenerating(false) }
  }

  const syncDelivery = async (id: Id<'deliveries'>) => {
    setSyncingDelivery(id)
    try {
      const result = await syncGitHubActions({ id })
      setGithubNote(result.message)
      setEvidence(result.message)
    } catch (error) { setGithubNote(error instanceof Error ? error.message : 'GitHub Actions sync failed.') }
    finally { setSyncingDelivery(null) }
  }

  return <main className="min-h-screen nexus-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark">N</div><div><div className="brand-name">NEXUS FORGE</div><div className="brand-sub">MANIFESTED INTELLIGENCE OS</div></div></div><div className="top-actions"><span className="live-pill"><span className="pulse-dot" /> CORE ONLINE</span><button className="ghost-button" onClick={() => setGithubNote('Free mode: GitHub Actions handles build/test; no paid Macaly GitHub integration is required.')}>Free resources</button><button className="profile-button">NF</button></div></header>
    <section className="hero-grid"><div className="hero-copy"><div className="eyebrow"><span /> INTENT → OUTCOME ENGINE</div><h1>Manifest<br/><em>intention</em> into reality.</h1><p className="hero-text">A governed AI council that researches, reasons, creates, builds, measures and improves—while you retain ownership and control.</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })}>Start a mission <span>↗</span></button><button className="secondary-button" onClick={() => document.getElementById('council')?.scrollIntoView({ behavior: 'smooth' })}>View the council <span>◌</span></button></div><div className="proof-row"><span>● HUMAN CONTROL</span><span>◉ VERIFIED ARTIFACTS</span><span>◇ OUTCOME MEMORY</span></div></div><div className="orbital-card"><div className="orbit orbit-one"><span>INTENT</span></div><div className="orbit orbit-two"><span>REASON</span></div><div className="orbit orbit-three"><span>CREATE</span></div><div className="core-orb"><strong>NEXUS</strong><small>FORGE CORE</small><i /></div><div className="orbit-label label-top">GENERATE</div><div className="orbit-label label-right">VERIFY</div><div className="orbit-label label-bottom">LEARN</div><div className="orbit-label label-left">ACT</div></div></section>
    <section className="stats-strip"><div><strong>{completion}%</strong><span>Mission completion</span></div><div><strong>06</strong><span>Agents in council</span></div><div><strong>{researchRows?.length ?? 0}</strong><span>Research nodes</span></div><div><strong>{artifactRows?.length ?? 0}</strong><span>Artifacts</span></div><div><strong>∞</strong><span>Learning potential</span></div></section>
    <section id="mission" className="workspace"><div className="workspace-head"><div><div className="section-kicker">CONTROL PLANE / 001</div><h2>Mission Console</h2></div><div className="status-chip"><span className="pulse-dot" /> {running ? 'ORCHESTRATING' : 'READY TO MANIFEST'}</div></div><div className="console-grid"><div className="mission-card glass-card"><div className="card-top"><span className="number-badge">01</span><span>OUTCOME CONTRACT</span><span className="verified">● VERIFIED SCHEMA</span></div><label htmlFor="mission-text">MISSION</label><textarea id="mission-text" value={mission} onChange={event => setMission(event.target.value)} /><div className="field-grid"><div><label>SUCCESS METRIC</label><div className="fake-input">Production-ready artifact <span>⌄</span></div></div><div><label>AUTHORITY</label><select value={autonomy} onChange={event => setAutonomy(event.target.value)}><option>Draft only</option><option>Approval required</option><option>Narrow auto-execution</option></select></div></div><div className="budget-row"><div><label>SPEND CAP</label><strong>${budget}</strong></div><input type="range" min="10" max="500" value={budget} onChange={event => setBudget(Number(event.target.value))}/></div><div className="contract-footer"><span>Evidence: tests · live URL · analytics · human review</span><button className="primary-button small" onClick={() => void launchMission()}>{running ? 'Orchestrating…' : 'Forge this mission ↗'}</button></div></div><div className="side-card glass-card"><div className="card-top"><span className="number-badge">02</span><span>GUARDRAILS</span></div><Guard label="Human approval gates" text="Required for high-impact actions"/><Guard label="Scoped capabilities" text="Agents cannot expand permissions"/><Guard label="Kill switch" text="Stop a project or connector instantly"/><div className="approval-box"><span>AUTHORITY LEVEL</span><strong>{autonomy}</strong><button onClick={() => setApproved(!approved)} className={approved ? 'approved-button' : 'secondary-button'}>{approved ? '✓ Mission approved' : 'Review & approve'}</button></div></div></div></section>
    <section id="council" className="workspace dark-section"><div className="workspace-head"><div><div className="section-kicker">INTELLIGENCE LAYER / 002</div><h2>Council Workspace</h2></div><span className="status-chip">{running ? '● LIVE' : '● STANDBY'}</span></div><div className="council-layout"><div className="agent-list">{agents.map(agent => <article className="agent-card" key={agent.name}><div className="agent-icon">{agent.icon}</div><div className="agent-main"><div className="agent-title"><strong>{agent.name}</strong><span className={`state ${agent.state.toLowerCase()}`}>{agent.state}</span></div><small>{agent.role}</small><div className="progress"><span style={{ width: `${agent.progress}%` }}/></div><p>{agent.note}</p></div></article>)}</div><div className="evidence-panel"><div className="panel-title"><span>LIVE EVIDENCE STREAM</span><span className="live-pill">● LIVE</span></div><div className="evidence-item"><span className="time">NOW</span><div><b>Orchestrator</b><p>{evidence}</p></div><span className="score">0.90</span></div><div className="evidence-item"><span className="time">READY</span><div><b>Critic Agent</b><p>Revenue assumptions remain gated for human review.</p></div><span className="warning">REVIEW</span></div><div className="decision-line"><span>ORCHESTRATOR DECISION</span><strong>{running ? 'Executing governed council pass' : 'Awaiting next mission'}</strong></div></div></div></section>
    <section className="workspace"><div className="workspace-head"><div><div className="section-kicker">RESEARCH + MEMORY / 003</div><h2>Evidence Intelligence</h2></div><span className="muted">Research is server-side, cited, persisted and reusable.</span></div><div className="console-grid"><div className="glass-card research-card"><label>RESEARCH QUERY</label><input value={researchQuery} onChange={event => setResearchQuery(event.target.value)} /><button className="primary-button small" disabled={!missionId || researching} onClick={() => void runResearch()}>{researching ? 'Researching…' : 'Research current web ↗'}</button>{researchRows?.slice(0, 3).map(row => <div className="evidence-item" key={row._id}><span className="time">WEB</span><div><b>{row.query}</b><p>{row.result.slice(0, 220)}</p></div><span className="score">{row.citations.length} src</span></div>)}</div><div className="glass-card research-card"><label>OUTCOME MEMORY</label><p>Mission outcomes are saved as concise, scoped memories instead of raw transcripts.</p><div className="guard-item"><span>◎</span><div><strong>Latest orchestration</strong><small>{missionId ? 'Persisted to Forge core' : 'Run a mission to create memory'}</small></div><b className="on">ON</b></div><div className="guard-item"><span>◎</span><div><strong>GitHub / build / deploy</strong><small>{githubNote}</small></div><b className="on">FREE</b></div></div></div></section>
    <section className="workspace artifact-section"><div className="workspace-head"><div><div className="section-kicker">MANIFESTATION GRAPH / 004</div><h2>Artifact Forge</h2></div><span className="muted">Generation creates a real stored artifact, but publication stays gated.</span></div><div className="glass-card research-card"><div className="field-grid"><div><label>ARTIFACT NAME</label><input value={artifactName} onChange={event => setArtifactName(event.target.value)} /></div><div><label>AUTHORITY</label><div className="fake-input">Human approval required</div></div></div><button className="primary-button small" disabled={!missionId || generating} onClick={() => void forgeArtifact()}>{generating ? 'Forging…' : 'Generate artifact ↗'}</button>{artifactRows?.map(row => <article className="artifact-card glass-card" key={row._id}><div className="artifact-id">AI</div><div className="artifact-content"><span>{row.status}</span><h3>{row.name}</h3><p>{row.content.slice(0, 320)}</p><button className="text-button" onClick={() => setGithubNote('Artifact is generated. Approve the delivery request, then run the free GitHub Actions workflow.')}>Review artifact →</button></div></article>)}</div><div className="graph-card glass-card"><div className="graph-copy"><div className="section-kicker">CLOSED LOOP</div><h3>Idea → Manifested Outcome</h3><p>Intent connects to plans, research, artifacts, evidence, decisions and memory—not a chat transcript.</p></div><div className="graph-flow"><span>INTENT</span><i>→</i><span>RESEARCH</span><i>→</i><span>REASON</span><i>→</i><span>CREATE</span><i>→</i><span>APPROVE</span><i>→</i><span>BUILD</span><i>→</i><span>MEASURE</span><i>→</i><span>MEMORY</span><i>↻</i></div></div></section>
    <section className="workspace delivery-section"><div className="workspace-head"><div><div className="section-kicker">DELIVERY CONTROL / 005</div><h2>GitHub → Build → Test → Deploy</h2></div><span className="muted">$0 GitHub Actions route · human approval remains required.</span></div><div className="console-grid"><div className="glass-card research-card"><div className="field-grid"><div><label>GITHUB TARGET</label><input value={targetRepo} onChange={event => setTargetRepo(event.target.value)} /></div><div><label>BRANCH</label><input value={targetBranch} onChange={event => setTargetBranch(event.target.value)} /></div></div><p>Prepare a delivery request. After approval, run <strong>NEXUS FORGE Delivery</strong> from GitHub Actions. Then sync the public workflow result back into the Forge.</p><button className="primary-button small" disabled={!missionId || !artifactRows?.[0] || deliveryBusy} onClick={async () => { if (!missionId || !artifactRows?.[0]) return; setDeliveryBusy(true); try { await prepareDelivery({ missionId, artifactId: artifactRows[0]._id, target: targetRepo, branch: targetBranch }); setGithubNote('Delivery request prepared. Waiting for explicit approval.'); } finally { setDeliveryBusy(false) } }}>{deliveryBusy ? 'Preparing…' : 'Prepare governed delivery ↗'}</button></div><div className="glass-card research-card"><div className="panel-title"><span>DELIVERY PIPELINE</span><span className="live-pill">● GATED</span></div>{deliveryRows?.slice(0, 3).map(row => <div className="delivery-row" key={row._id}><div><strong>{row.target}</strong><small>{row.branch} · {row.status}</small><p>{row.evidence}</p></div>{row.stage === 'approval' ? <button className="secondary-button" onClick={async () => { await approveDelivery({ id: row._id, approved: true }); setGithubNote('Approved. Run the NEXUS FORGE Delivery workflow in GitHub Actions, then sync its result here.') }}>Approve GitHub action</button> : row.stage === 'github' ? <button className="secondary-button" disabled={syncingDelivery === row._id} onClick={() => void syncDelivery(row._id)}>{syncingDelivery === row._id ? 'Syncing…' : 'Sync GitHub Actions'}</button> : row.stage === 'build' ? <button className="secondary-button" disabled={syncingDelivery === row._id} onClick={() => void syncDelivery(row._id)}>{syncingDelivery === row._id ? 'Syncing…' : 'Sync build/test'}</button> : row.stage === 'test' ? <button className="secondary-button" onClick={async () => { await advanceDelivery({ id: row._id, nextStage: 'deploy', evidence: 'GitHub Actions build and tests passed. Deployment is now ready for separate human approval.' }) }}>Approve deploy stage</button> : row.stage === 'deploy' ? <button className="secondary-button" onClick={async () => { await advanceDelivery({ id: row._id, nextStage: 'verified', evidence: 'Deployment verification recorded by human operator.' }) }}>Verify outcome</button> : <span className="status-chip">{row.stage}</span>}</div>)}</div></div></section>
    <section className="pricing-section"><div className="section-kicker">OUTCOME ECONOMY</div><h2>Start free. Pay when the work creates value.</h2><p>Use the core mission workspace without a subscription. Upgrade only for heavier execution.</p><div className="pricing-grid"><div><strong>FREE</strong><span>$0</span><small>Mission drafts · basic council · exportable blueprints</small></div><div className="featured-price"><strong>FORGE RUN</strong><span>$9+</span><small>Verified build, tests, artifacts and outcome evidence</small></div><div><strong>AUTONOMOUS SPRINT</strong><span>$49+</span><small>Time-boxed multi-agent execution with spend cap</small></div></div></section>
    <footer><div className="brand-name">NEXUS FORGE</div><span>Manifested Intelligence · Human governed · Evidence first</span><span>Built to evolve, not to pretend.</span></footer>
  </main>
}

function Guard({ label, text }: { label: string; text: string }) { return <div className="guard-item"><span>◎</span><div><strong>{label}</strong><small>{text}</small></div><b className="on">ON</b></div> }
