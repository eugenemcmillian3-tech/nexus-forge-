import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { WorkspaceLayout } from '../components/workspace-layout'
import metadata from '../metadata.json'

export const Route = createFileRoute('/readiness')({
  component: ReadinessChecker,
  head: () => ({
    title: metadata['/readiness']?.title ?? metadata.default?.title,
    meta: [{ name: 'description', content: metadata['/readiness']?.description ?? metadata.default?.description }],
  }),
})

type RunSummary = { _id: Id<'readinessRuns'>; siteUrl: string; label: string; status: 'pass' | 'fail'; passedCount: number; failedCount: number; totalCount: number; ranAt: number }
type CheckRow = { _id: Id<'readinessChecks'>; checkKey: string; name: string; criterion: string; severity: 'required' | 'warning'; status: 'pass' | 'fail'; detail: string; evidence: string }
type RunDetail = { run: RunSummary; checks: CheckRow[] }

function formatTime(ms: number) {
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ReadinessChecker() {
  const [siteUrl, setSiteUrl] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<Id<'readinessRuns'> | null>(null)
  const runChecks = useAction(api.readiness.run)
  const runs = useQuery(api.readiness.listRuns) ?? []
  const detail: RunDetail | undefined = useQuery(api.readiness.getRun, selectedRunId ? { runId: selectedRunId } : 'skip')

  const submit = async () => {
    const target = siteUrl.trim()
    if (!target) { setError('Enter the deployment URL to validate.'); return }
    setBusy(true)
    setError(null)
    try {
      const result = await runChecks({ siteUrl: target, label: label.trim() || undefined })
      setSelectedRunId(result.runId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The readiness check could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const failedChecks = detail?.checks.filter(c => c.status === 'fail') ?? []

  return <WorkspaceLayout title="Launch Readiness Checker" eyebrow="PRODUCTION VALIDATION / LRC"><div className="nexus-shell" data-testid="readiness-root"> 
    <main className="workspace rc-page" data-state={busy ? 'loading' : runs.length > 0 ? 'ready' : 'empty'}>
      <div className="workspace-head">
        <div>
          <div className="section-kicker">PRODUCTION VALIDATION / LRC</div>
          <h2>Launch Readiness Checker</h2>
          <p className="rc-sub">Validate a live web deployment against auditable acceptance criteria. Every check records the evidence behind its pass or fail result.</p>
        </div>
        <Link className="ghost-button" to="/">← Back to Forge</Link>
      </div>

      <section className="glass-card rc-card rc-form" data-testid="rc-form">
        <div className="field-grid">
          <div>
            <label htmlFor="rc-url">DEPLOYMENT URL</label>
            <input id="rc-url" data-testid="rc-url" value={siteUrl} onChange={event => setSiteUrl(event.target.value)} placeholder="https://example.com" />
          </div>
          <div>
            <label htmlFor="rc-label">LABEL (OPTIONAL)</label>
            <input id="rc-label" data-testid="rc-label" value={label} onChange={event => setLabel(event.target.value)} placeholder="Production site" />
          </div>
        </div>
        <div className="hero-actions">
          <button className="primary-button" data-testid="rc-run" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Checking…' : 'Run readiness check ↗'}
          </button>
          <span className="status-chip">● EVIDENCE REQUIRED PER CHECK</span>
        </div>
        {error && <p className="rc-error" data-testid="rc-error" role="alert">{error}</p>}
      </section>

      {detail && <section className="glass-card rc-card" data-testid="rc-result" data-state={busy ? 'loading' : 'ready'}>
        <div className="panel-title">
          <span>RESULT · {formatTime(detail.run.ranAt)}</span>
          <span className={detail.run.status === 'pass' ? 'rc-badge rc-pass' : 'rc-badge rc-fail'}>
            {detail.run.status === 'pass' ? '✔ READY TO LAUNCH' : '✘ NOT READY'}
          </span>
        </div>
        <p className="rc-target"><strong>{detail.run.label}</strong> · <a href={detail.run.siteUrl} target="_blank" rel="noreferrer">{detail.run.siteUrl}</a></p>
        <p className="rc-score">
          {detail.run.passedCount}/{detail.run.totalCount} checks passed
          {detail.run.failedCount > 0 && <> · <strong>{detail.run.failedCount} failed</strong></>}
        </p>
        {failedChecks.length > 0 && <div className="rc-failed-report" data-testid="rc-failed">
          <h3>Failed checks</h3>
          {failedChecks.map(check => <div className="rc-failed-row" key={check._id}>
            <span className="rc-x">✘</span>
            <div>
              <strong>{check.name}{check.severity === 'required' ? ' (required)' : ' (warning)'}</strong>
              <p>{check.detail}</p>
              <small>Evidence: {check.evidence}</small>
            </div>
          </div>)}
        </div>}
        <div className="rc-checks">
          {detail.checks.map(check => <div className="guard-item rc-check" key={check._id} data-testid={`rc-check-${check.checkKey}`} data-status={check.status}>
            <span className={check.status === 'pass' ? 'rc-ok' : 'rc-x-mark'}>{check.status === 'pass' ? '✔' : '✘'}</span>
            <div>
              <strong>{check.name} · {check.severity === 'required' ? 'REQUIRED' : 'WARNING'}</strong>
              <small>{check.criterion}</small>
              <p className="rc-detail">{check.detail}</p>
              <small className="rc-evidence">Evidence: {check.evidence}</small>
            </div>
            <span className={check.status === 'pass' ? 'rc-badge rc-pass' : 'rc-badge rc-fail'}>{check.status.toUpperCase()}</span>
          </div>)}
        </div>
      </section>}

      <section className="glass-card rc-card" data-testid="rc-history">
        <div className="panel-title"><span>AUDIT HISTORY</span><span className="live-pill">● {runs.length} RUN{runs.length === 1 ? '' : 'S'}</span></div>
        {runs.length === 0 ? <div className="empty-state"><h3>No readiness runs yet</h3><p>Run your first check to create an auditable pass/fail record.</p></div> :
          runs.map(run => <button className="rc-history-row" key={run._id} data-testid="rc-history-row" onClick={() => setSelectedRunId(run._id)}>
            <div><strong>{run.label}</strong><small>{run.siteUrl} · {formatTime(run.ranAt)}</small></div>
            <span className={run.status === 'pass' ? 'rc-badge rc-pass' : 'rc-badge rc-fail'}>{run.passedCount}/{run.totalCount} · {run.status.toUpperCase()}</span>
          </button>)}
      </section>
    </main>
  </div></WorkspaceLayout>
}
