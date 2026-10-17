import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function PlatformTaskPerformance({ missionId }: { missionId: Id<'missions'> | null }) {
  const summary = useQuery(api.platformTasks.summary, missionId ? { missionId } : {})
  const names = { research: 'Cited research', artifact: 'Artifact structural quality', delivery: 'Verified deployment' }
  return <div className="glass-card research-card">
    <h2>NEXUS FORGE task performance</h2>
    <p>{missionId ? 'Selected mission' : 'All owned missions'} · Latest 100 recorded task attempts since instrumentation was enabled. Success rate uses terminal results only; pending work is unresolved and excluded. No history is backfilled.</p>
    <p>Research requires saved citations. Artifact success means generated content passed structural checks; it does not establish browser behavior. Delivery success requires the validated deployment callback. Delivery elapsed time starts at preparation and includes approval and workflow waits. Research and artifact times span the measured operation, including retries.</p>
    {!summary ? <p role="status">Loading platform task measurements…</p> : <>
      {summary.sampled === 0 && <p>No measured platform tasks yet. New research, artifact generation and dispatched deliveries will appear as you use the existing workflow.</p>}
      {summary.truncated && <p>Showing the latest 100 recorded attempts; older records are outside this summary.</p>}
      {summary.rows.map(row => <div className="guard-item" key={row.kind}>
        <div><strong>{names[row.kind]}</strong>
          <p>{row.successes} succeeded · {row.failures} failed · {row.pending} pending / unresolved</p>
          <p>Success rate: {row.successRate === null ? 'Not measured' : row.successRate.toFixed(1) + '%'} · Mean completed elapsed time: {row.meanSeconds === null ? 'Not measured' : row.meanSeconds.toFixed(2) + ' seconds'} ({row.timedCount} timed results)</p>
        </div>
      </div>)}
    </>}
    <p>Private server-recorded platform observations. These do not establish customer adoption, revenue, causal improvement or independent certification. Provider exceptions are failures; process interruption can leave a pending record.</p>
  </div>
}
