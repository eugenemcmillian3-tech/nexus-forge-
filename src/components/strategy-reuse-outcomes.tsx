import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useActiveMission } from '../hooks/use-active-mission'

type Measurement = { id: string; missionId: string; missionTitle: string; metric: string; actual: number; target: number; unit: string; status: string; evidence: string[]; observedAt: number }
type Comparison = { version: string; strategyKey: string; strategyId: string; lessonId: string; lesson: string; sourceReceiptId: string; baseline: Measurement; candidate: Measurement; direction: string; delta: number; outcome: string; notes: string; evidenceStatus: string; limitation: string }

export function StrategyReuseOutcomes() {
  const { missionId, mission } = useActiveMission()
  const sources = useQuery(api.missionSources.list, missionId ? { missionId } : 'skip')
  const candidates = useQuery(api.verification.measurements, missionId ? { missionId } : 'skip')
  const missions = useQuery(api.missions.list, { ownerKey: 'local-workspace', paginationOpts: { numItems: 50, cursor: null } })
  const history = useQuery(api.learningEngine.listReuseComparisons, {})
  const record = useMutation(api.learningEngine.recordReuseComparison)
  const [lessonId, setLessonId] = useState('')
  const [baselineMissionId, setBaselineMissionId] = useState('')
  const baselines = useQuery(api.verification.measurements, baselineMissionId ? { missionId: baselineMissionId as Id<'missions'> } : 'skip')
  const [baselineId, setBaselineId] = useState('')
  const [candidateId, setCandidateId] = useState('')
  const [applied, setApplied] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { setLessonId(''); setCandidateId(''); setApplied(false); setError(''); setMessage('') }, [missionId])
  const lessonSources = (sources ?? []).filter(row => row.path === '/learning')
  const save = async () => {
    if (!missionId) return
    setBusy(true); setError(''); setMessage('')
    try {
      const id = await record({ missionId, lessonId: lessonId as Id<'memories'>, baselineMeasurementId: baselineId as Id<'measurements'>, candidateMeasurementId: candidateId as Id<'measurements'>, applied, notes: notes.trim() })
      setMessage('Saved reuse outcome comparison · ' + id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not compare these measurements. Review their scope and timing, then retry.') }
    finally { setBusy(false) }
  }
  const label = (row: { metric: string; actual: number; target: number; unit: string }) => row.metric + ': ' + row.actual + ' ' + row.unit + ' · target ' + row.target
  return <div className="glass-card research-card" id="strategy-reuse-outcomes">
    <div className="panel-title"><span>STRATEGY REUSE OUTCOMES</span><span className="live-pill">OBSERVED COMPARISONS</span></div>
    <p>Connect an applied reviewed lesson to a later mission measurement and a measurement from a different, earlier baseline mission. The mission must have been created from that lesson. A handoff alone is not evidence that the lesson was applied.</p>
    <p className="muted-copy">Compare the same metric, unit and target. Baseline evidence must precede the lesson handoff; the reuse measurement must follow it. Supported metrics are recorded runtime cost (lower is better) and governed delivery readiness (higher is better). These do not measure business results or prove causation.</p>
    {!missionId ? <Link className="secondary-button" to="/mission">Select the mission that reused the lesson →</Link> : sources === undefined ? <p>Loading reviewed lesson provenance…</p> : lessonSources.length === 0 ? <><p>The selected mission has no reviewed lesson handoff. Save a reviewed lesson below and use its mission-draft handoff, then collect subsequent measurements.</p><a className="secondary-button" href="#reviewed-learning-memory">Continue to reviewed lesson handoff ↓</a></> : <form onSubmit={event => { event.preventDefault(); void save() }}>
      <p>Reuse mission: <strong>{mission?.title ?? missionId}</strong></p>
      <label htmlFor="reuse-lesson">REVIEWED SOURCE LESSON</label><select id="reuse-lesson" value={lessonId} required onChange={event => setLessonId(event.target.value)}><option value="">Choose the linked lesson</option>{lessonSources.map(row => <option key={row.sourceMemoryId} value={row.sourceMemoryId}>{row.key}</option>)}</select>
      <label htmlFor="reuse-baseline-mission">EARLIER BASELINE MISSION</label><select id="reuse-baseline-mission" value={baselineMissionId} required onChange={event => { setBaselineMissionId(event.target.value); setBaselineId('') }}><option value="">Choose an owned baseline mission</option>{(missions?.page ?? []).filter(row => row._id !== missionId).map(row => <option key={row._id} value={row._id}>{row.title}</option>)}</select>
      <p className="muted-copy">Mission selector shows up to 50 recent missions; measurement selectors show the latest 20 records per mission.</p>
      <label htmlFor="reuse-baseline">BASELINE MEASUREMENT</label><select id="reuse-baseline" required value={baselineId} onChange={event => setBaselineId(event.target.value)}><option value="">Choose earlier measurement</option>{(baselines ?? []).map(row => <option key={row._id} value={row._id}>{label(row)}</option>)}</select>
      {baselineMissionId && baselines?.length === 0 && <p>No measurements are recorded for this baseline mission.</p>}
      <label htmlFor="reuse-candidate">SUBSEQUENT REUSE MEASUREMENT</label><select id="reuse-candidate" required value={candidateId} onChange={event => setCandidateId(event.target.value)}><option value="">Choose subsequent measurement</option>{(candidates ?? []).map(row => <option key={row._id} value={row._id}>{label(row)}</option>)}</select>
      {candidates?.length === 0 && <p>No measurements recorded yet. Record delivery outcome evidence or runtime cost in the guided workflow first.</p>}
      <label htmlFor="reuse-notes">HOW THE LESSON WAS APPLIED AND CONDITIONS WERE COMPARABLE</label><textarea id="reuse-notes" required minLength={12} maxLength={1600} rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
      <label><input type="checkbox" checked={applied} onChange={event => setApplied(event.target.checked)} /> I applied this lesson and reviewed the comparability of these measurements.</label>
      <button className="secondary-button" disabled={busy || !lessonId || !baselineId || !candidateId || !applied || notes.trim().length < 12}>{busy ? 'Saving reuse comparison…' : 'Save observed reuse comparison'}</button>
    </form>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <h3>Saved reuse outcome evidence</h3>
    {history === undefined ? <p>Loading reuse comparisons…</p> : history.length === 0 ? <p>No reuse outcome comparisons saved. A retrieved lesson or mission handoff is not a measured improvement.</p> : history.map(row => {
      let value: Comparison
      try { value = JSON.parse(row.value) as Comparison; if (value.version !== 'strategy-reuse-v1' || !value.baseline || !value.candidate) throw new Error('Unknown format') } catch { return <p key={row._id}>Could not display comparison receipt {row._id}.</p> }
      return <article className="evidence-item" key={row._id}><div><b>{value.strategyKey} · {value.outcome.toUpperCase()}</b><p>{value.lesson}</p><p>{value.baseline.missionTitle}: {value.baseline.actual} → {value.candidate.missionTitle}: {value.candidate.actual} {value.candidate.unit} · delta {value.delta} · {value.direction} is better</p><p>{value.notes}</p><p className="muted-copy">{value.evidenceStatus}. {value.limitation}</p><details><summary>Inspect provenance and measurement snapshots</summary><p>Strategy: {value.strategyId} · Lesson: {value.lessonId} · Handoff: {value.sourceReceiptId}</p>{[value.baseline, value.candidate].map(item => <div key={item.id}><strong>{item.missionTitle} · {item.metric}</strong><p>Mission: {item.missionId} · Measurement: {item.id} · Target: {item.target} {item.unit} · Recorded {new Date(item.observedAt).toLocaleString()}</p>{item.evidence.map((evidence, index) => <p key={index}>{evidence}</p>)}</div>)}<p>Comparison receipt: {row._id}</p></details></div></article>
    })}
    <p className="muted-copy">Latest 20 private comparisons. Results retain measured regressions and unchanged outcomes. Repeated saves of the same lesson and measurement pair reuse the original receipt. No strategy is automatically promoted.</p>
    <Link className="secondary-button" to="/workflow">Continue to mission measurement &amp; outcome records →</Link>
  </div>
}
