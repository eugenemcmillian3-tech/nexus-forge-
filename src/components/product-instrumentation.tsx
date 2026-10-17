import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { productEventsEndpoint } from '../lib/product-events-endpoint'

export function ProductInstrumentation({ missionId = null, missionTitle }: { missionId?: Id<'missions'> | null; missionTitle?: string }) {
  const sources = useQuery(api.productTelemetry.list, {})
  const create = useAction(api.productTelemetry.create)
  const rotate = useAction(api.productTelemetry.rotate)
  const enable = useMutation(api.productTelemetry.setEnabled)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [secret, setSecret] = useState<{ sourceId: string; token: string } | null>(null)
  const endpoint = productEventsEndpoint(import.meta.env.VITE_CONVEX_URL ?? '')
  async function work(fn: () => Promise<void>) {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : 'Instrumentation failed') }
    finally { setBusy(false) }
  }
  return <div className="glass-card research-card">
    <h2>Instrument actual product tasks</h2>
    <p>Your product server reports each completed task with a stable event key and success boolean. Every ten unique events creates a measured success-rate outcome with an 80% target. Authenticated source data is not independent verification. Keep source tokens on your product server.</p>
    {!endpoint && <p role="alert">The task ingestion endpoint is unavailable. Check this workspace's backend configuration before creating a source.</p>}
    {missionId ? <form onSubmit={e => {
      e.preventDefault()
      if (busy || !endpoint) return
      const name = String(new FormData(e.currentTarget).get('name') ?? '').trim()
      if (!name) return
      void work(async () => { setSecret(null); setSecret(await create({ missionId, name })) })
    }}>
      <p>Selected mission: <strong>{missionTitle ?? 'Current mission'}</strong></p>
      <label>Product source name<input name="name" required maxLength={120} disabled={busy}/></label>
      <button className="secondary-button" disabled={busy || !endpoint}>Create task measurement source</button>
    </form> : <p><Link className="secondary-button" to="/mission">Select a mission to connect product tasks →</Link></p>}
    {secret && <div>
      <h3>One-time server configuration</h3>
      <p>Source: <code>{secret.sourceId}</code><br/>Endpoint: <code>{endpoint ?? 'Unavailable'}</code></p>
      <label>Source token shown once<input readOnly type="password" value={secret.token}/></label>
      <button className="secondary-button" onClick={async () => {
        try { await navigator.clipboard.writeText(secret.token); setError('') }
        catch { setError('Could not copy the token. Copy it from the token field or rotate it when ready.') }
      }}>Copy source token</button>
      <button className="ghost-button" onClick={() => setSecret(null)}>Hide token</button>
      <p>Use scripts/product-event-client.mjs from your product server. Set NEXUS_PRODUCT_EVENTS_ENDPOINT to the endpoint above, NEXUS_PRODUCT_SOURCE_ID to this source, and NEXUS_PRODUCT_SOURCE_TOKEN to the token. Report actual completed tasks; do not send sample events to claim customer outcomes.</p>
      <p>Saved lists never return token hashes or values. Rotate the token if it is lost.</p>
    </div>}
    <h3>Saved sources · all owned missions</h3>
    {sources === undefined ? <p role="status">Loading task measurement sources…</p> : sources.length === 0 ? <p>No task sources connected yet. Create one for the selected mission, then connect its product server.</p> : sources.map(s => <div key={s._id}>
      <h3>{s.name} · {s.enabled ? 'Enabled' : 'Disabled'}</h3>
      <p>{s.received}/1000 accepted events · {s.batch} measured batches · {s.pendingCount}/10 pending events</p>
      <p>Mission <code>{s.missionId}</code> · Source <code>{s._id}</code></p>
      <button className="secondary-button" disabled={busy} onClick={() => void work(async () => { setSecret(null); const r = await rotate({ sourceId: s._id }); setSecret({ sourceId: s._id, token: r.token }) })}>Rotate source token</button>
      <button className="ghost-button" disabled={busy} onClick={() => void work(async () => { await enable({ sourceId: s._id, enabled: !s.enabled }) })}>{s.enabled ? 'Disable ingestion' : 'Enable ingestion'}</button>
    </div>)}
    {error && <p role="alert">{error}</p>}
  </div>
}
