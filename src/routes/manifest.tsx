import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { WorkspaceLayout } from '../components/workspace-layout'

export const Route = createFileRoute('/manifest')({ component: ManifestIntelligencePage })

type BlueprintRow = { _id: string; key: string; value: string; confidence: number; source: string }
type StrategyRow = { _id: string; key: string; value: string; confidence: number; source: string }

function parseRecord(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown> } catch { return { blueprint: value } }
}

function ManifestIntelligencePage() {
  const synthesize = useAction(api.manifestIntelligence.synthesize)
  const savedRows = useQuery(api.manifestIntelligence.listBlueprints, {})
  const strategyRows = useQuery(api.manifestIntelligence.listStrategies, {})
  const recordOutcome = useMutation(api.manifestIntelligence.recordStrategyOutcome)
  const [intent, setIntent] = useState('Create a useful digital product that turns a user idea into a tested artifact with measurable value.')
  const [domain, setDomain] = useState('AI product / venture')
  const [budget, setBudget] = useState(25)
  const [horizon, setHorizon] = useState('14 days')
  const [constraints, setConstraints] = useState('Prefer existing NEXUS FORGE tools and reliable low-cost resources. Keep secrets private and consequential actions governed.')
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('A usable deliverable, passing tests, evidence for important claims, and measurable success criteria.')
  const [blueprint, setBlueprint] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [strategyId, setStrategyId] = useState('')
  const [outcomeStatus, setOutcomeStatus] = useState<'succeeded' | 'partial' | 'failed' | 'inconclusive'>('succeeded')
  const [actualResult, setActualResult] = useState('')
  const [evidence, setEvidence] = useState('')
  const [actualCost, setActualCost] = useState('')

  const generate = async () => {
    setError(''); setNotice('')
    if (intent.trim().length < 12) { setError('Describe the intended outcome in at least 12 characters.'); return }
    setBusy(true)
    try {
      const result = await synthesize({ intent: intent.trim(), domain, budget, horizon, constraints: constraints.trim(), acceptanceCriteria: acceptanceCriteria.trim() })
      setBlueprint(result.blueprint)
      setNotice(result.saved ? result.strategyCount > 0 ? `Blueprint saved privately; ${result.strategyCount} structured strateg${result.strategyCount === 1 ? 'y' : 'ies'} saved to the strategy ledger. This is a proposal, not an executed result.` : 'Blueprint saved privately, but the provider did not return a valid structured strategy block. The blueprint is available; no strategy records were added. Retry synthesis or inspect provider output before treating the ledger as populated.' : 'Blueprint generated.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Manifest synthesis failed. Check provider health and try again.') }
    finally { setBusy(false) }
  }

  const blueprints = (savedRows ?? []) as BlueprintRow[]
  const strategies = (strategyRows ?? []) as StrategyRow[]
  const saveOutcome = async () => {
    setError(''); setNotice('')
    try {
      await recordOutcome({ strategyId: strategyId as any, outcomeStatus, actualResult, evidence, ...(actualCost.trim() ? { actualCost: Number(actualCost) } : {}) })
      setNotice('Measured outcome saved with its evidence. This records an observation; it does not prove the strategy caused the result.')
      setActualResult(''); setEvidence(''); setActualCost('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the strategy outcome.') }
  }

  return <WorkspaceLayout title="Manifest Intelligence" eyebrow="RESEARCH FRONTIER / INTENT → POSSIBILITY">
    <div className="hero-grid">
      <div className="hero-copy">
        <div className="eyebrow"><span /> OUTCOME SYNTHESIS ENGINE</div>
        <h2>Imagine beyond the prompt. <em>Design what comes next.</em></h2>
        <p className="hero-text">Translate an intention into a practical, testable blueprint using generative creation, cross-domain planning, compounding learning and specialist critique. Capability is measured by evidence—not claims of AGI or superintelligence.</p>
        <div className="proof-row"><span>● BOUNDED AI RUN</span><span>◉ PRIVATE MEMORY</span><span>◇ HUMAN CONTROL</span></div>
      </div>
      <div className="glass-card research-card">
        <div className="panel-title"><span>THE FOUR-WAY SYNTHESIS</span><span className="live-pill">DESIGN MODEL</span></div>
        {[
          ['01 / GENERATIVE', 'Create tangible possibilities'],
          ['02 / COMPOUNDING', 'Learn from verified outcomes'],
          ['03 / GENERALITY', 'Transfer methods across domains'],
          ['04 / SPECIALISTS', 'Compare and critique approaches'],
        ].map(([label, text]) => <div className="decision-line" key={label}><span>{label}</span><strong>{text}</strong></div>)}
        <p className="muted-copy">One governed goal loop, independent verification, reusable evidence and operator authority.</p>
      </div>
    </div>

    <div className="console-grid">
      <div className="glass-card research-card">
        <div className="panel-title"><span>INTENT COMPILER</span><span className="live-pill">PROVIDER ROUTED</span></div>
        <label htmlFor="manifest-intent">WHAT DO YOU WANT TO MAKE POSSIBLE?</label>
        <textarea id="manifest-intent" rows={5} maxLength={3000} value={intent} onChange={e => setIntent(e.target.value)} />
        <div className="field-grid">
          <div><label htmlFor="manifest-domain">DOMAIN</label><select id="manifest-domain" value={domain} onChange={e => setDomain(e.target.value)}>{['AI product / venture','Software and automation','Creative media and art','Scientific research','Education and learning','Business operations','Personal project','Cross-domain exploration'].map(v => <option key={v}>{v}</option>)}</select></div>
          <div><label htmlFor="manifest-budget">BUDGET CAP · USD</label><input id="manifest-budget" type="number" min={0} max={500} value={budget} onChange={e => setBudget(Math.max(0, Math.min(500, Number(e.target.value))))} /></div>
        </div>
        <label htmlFor="manifest-horizon">TIME HORIZON</label>
        <select id="manifest-horizon" value={horizon} onChange={e => setHorizon(e.target.value)}>{['48 hours','7 days','14 days','30 days','90 days','Exploratory / no fixed deadline'].map(v => <option key={v}>{v}</option>)}</select>
        <label htmlFor="manifest-constraints">CONSTRAINTS & ASSUMPTIONS</label>
        <textarea id="manifest-constraints" rows={3} maxLength={2000} value={constraints} onChange={e => setConstraints(e.target.value)} />
        <label htmlFor="manifest-criteria">MEASURABLE ACCEPTANCE CRITERIA</label>
        <textarea id="manifest-criteria" rows={3} maxLength={2000} value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} />
        <button className="primary-button" disabled={busy} onClick={() => void generate()}>{busy ? 'Synthesizing blueprint…' : 'Synthesize a new blueprint ↗'}</button>
        <p className="muted-copy">Synthesis calls the server-side provider router and saves to the authenticated operator's memory. It does not deploy, purchase, or perform external writes.</p>
        {error && <p className="warning" role="alert">{error}</p>}
        {notice && <p className="receipt" role="status">{notice}</p>}
      </div>
      <div className="glass-card research-card">
        <div className="panel-title"><span>BLUEPRINT OUTPUT</span><span className="live-pill">{blueprint ? 'DRAFT READY' : 'AWAITING INTENT'}</span></div>
        {blueprint ? <><div className="decision-line"><span>STATUS</span><strong>AI-GENERATED PROPOSAL</strong></div><pre className="manifest-blueprint whitespace-pre-wrap break-words text-sm leading-7">{blueprint}</pre><button className="secondary-button" onClick={() => { void navigator.clipboard?.writeText(blueprint).then(() => setNotice('Blueprint copied.')).catch(() => setError('Clipboard unavailable; select and copy the text manually.')) }}>Copy blueprint</button></> : <div className="empty-state"><h3>Your next possibility starts here.</h3><p>Generate a blueprint with candidate strategies, a first experiment, architecture, guardrails, metrics and one next action.</p></div>}
      </div>
    </div>

    <div className="glass-card research-card mt-8">
      <div className="panel-title"><span>STRATEGY & OUTCOME LEDGER</span><span className="live-pill">{strategies.length} RECORDS</span></div>
      <p className="muted-copy">Record observed results only after an experiment runs. Attach a measurement source; estimated value is not actual value.</p>
      {strategyRows === undefined ? <p>Loading private strategy history…</p> : strategies.length === 0 ? <p className="empty-state">No structured strategies saved yet. A blueprint save does not guarantee strategy persistence: each synthesis receipt now reports whether valid machine-readable strategies were returned and saved.</p> : strategies.map(row => {
        const item = parseRecord(row.value)
        return <article className="workflow-step flex gap-4 py-4 border-b border-slate-800/10" key={row._id}>
          <span className="workflow-step-mark">↗</span><span className="workflow-step-copy flex-1"><strong>{String(item.name ?? 'Candidate strategy')}</strong><small>{String(item.mechanism ?? '')}</small><small>Evidence horizon: {String(item.timeToEvidence ?? 'Not specified')} · Outcome: {String(item.outcomeStatus ?? 'not_measured')}</small>{item.actualResult ? <small>Observed: {String(item.actualResult)} · Evidence: {String(item.evidence ?? 'Not supplied')} · Actual cost: {item.actualCost == null ? 'Not recorded' : '$' + String(item.actualCost)}</small> : null}</span>
          <span className="workflow-step-state">{row.source === 'manifest-intelligence-operator-measured-outcome' ? 'OUTCOME RECORDED' : 'PROPOSED'}</span>
        </article>
      })}
      {strategies.length > 0 && <div className="field-grid mt-5">
        <div><label htmlFor="strategy-target">STRATEGY TO UPDATE</label><select id="strategy-target" value={strategyId} onChange={e => setStrategyId(e.target.value)}><option value="">Select a strategy</option>{strategies.map(row => <option key={row._id} value={row._id}>{String(parseRecord(row.value).name ?? row.key)}</option>)}</select></div>
        <div><label htmlFor="strategy-status">OBSERVED OUTCOME</label><select id="strategy-status" value={outcomeStatus} onChange={e => setOutcomeStatus(e.target.value as typeof outcomeStatus)}><option value="succeeded">Succeeded</option><option value="partial">Partially succeeded</option><option value="failed">Failed</option><option value="inconclusive">Inconclusive</option></select></div>
        <div><label htmlFor="strategy-result">ACTUAL RESULT / METRIC</label><textarea id="strategy-result" rows={2} maxLength={2000} value={actualResult} onChange={e => setActualResult(e.target.value)} placeholder="Observed value, baseline → actual, sample size…" /></div>
        <div><label htmlFor="strategy-evidence">EVIDENCE SOURCE</label><textarea id="strategy-evidence" rows={2} maxLength={3000} value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="Test run, analytics report, URL, or reproducible notes…" /></div>
        <div><label htmlFor="strategy-cost">ACTUAL COST · USD (OPTIONAL)</label><input id="strategy-cost" type="number" min={0} max={1000000} value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="Measured spend only" /></div>
      </div>}
      {strategies.length > 0 && <button className="primary-button mt-4" disabled={!strategyId || actualResult.trim().length < 3 || evidence.trim().length < 3} onClick={() => void saveOutcome()}>Save measured outcome</button>}
    </div>

    <div className="glass-card research-card mt-8" aria-labelledby="manifest-live-check-title">
      <div className="panel-title"><span id="manifest-live-check-title">LIVE PROVIDER VERIFICATION</span><span className="status-chip">OPERATOR ACTION REQUIRED</span></div>
      <p className="muted-copy">Automated tests cover successful persistence, privacy isolation, malformed strategy output, and provider outages. They do not substitute for a real configured-provider call in your signed-in production workspace.</p>
      <div className="workflow-step-list">
        <article className="workflow-step"><span className="workflow-step-mark">1</span><span className="workflow-step-copy"><strong>Run a real synthesis</strong><small>Use the intent compiler above while signed in. This uses the configured provider router and does not deploy or purchase anything.</small></span></article>
        <article className="workflow-step"><span className="workflow-step-mark">2</span><span className="workflow-step-copy"><strong>Check the live receipt</strong><small>A successful response should confirm private blueprint persistence and report the structured strategy count. A provider error is a failed run, not a success.</small></span></article>
        <article className="workflow-step"><span className="workflow-step-mark">3</span><span className="workflow-step-copy"><strong>Confirm the private ledger</strong><small>Verify the new blueprint and strategy entries appear in this operator's history. Do not mark the live-provider milestone complete until both the receipt and persisted records are visible.</small></span></article>
      </div>
      <p className="muted-copy">Current evidence status: automated persistence tests pass; production provider-to-ledger execution is not yet independently confirmed.</p>
    </div>

    <div className="glass-card research-card mt-8">
      <div className="panel-title"><span>PRIVATE BLUEPRINT MEMORY</span><span className="live-pill">{blueprints.length} SAVED</span></div>
      <p className="muted-copy">Saved plans preserve continuity but do not prove execution or success.</p>
      {savedRows === undefined ? <p>Loading saved blueprints…</p> : blueprints.length === 0 ? <p className="empty-state">No blueprints saved yet. Your first synthesis will appear here.</p> : blueprints.map(row => {
        const item = parseRecord(row.value)
        return <button key={row._id} className="portfolio-row" onClick={() => { setIntent(String(item.intent ?? '')); setDomain(String(item.domain ?? 'General')); setBudget(Number(item.budget ?? 0)); setHorizon(String(item.horizon ?? 'Not specified')); setConstraints(String(item.constraints ?? '')); setAcceptanceCriteria(String(item.acceptanceCriteria ?? '')); setBlueprint(String(item.blueprint ?? row.value)); setNotice('Loaded a saved blueprint. Review it before reusing.'); setError('') }}>
          <div className="portfolio-main"><strong>{String(item.intent ?? 'Saved blueprint')}</strong><p>{String(item.domain ?? 'General')} · {String(item.horizon ?? 'Not specified')} · budget cap ${Number(item.budget ?? 0)}</p></div>
          <div className="portfolio-cell"><small>TYPE</small><b>BLUEPRINT</b></div><div className="portfolio-cell"><small>RECORD CONFIDENCE</small><b>{Math.round(row.confidence * 100)}%</b></div>
        </button>
      })}
    </div>
  </WorkspaceLayout>
}
