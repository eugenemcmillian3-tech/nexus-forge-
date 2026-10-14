import { WorkspaceLayout } from './workspace-layout'

export function WorkspaceLoading({ title }: { title: string }) {
  return <WorkspaceLayout title={title} eyebrow="LOADING / MISSION CONTEXT">
    <section className="workspace" role="status" aria-live="polite" aria-busy="true">
      <div className="glass-card research-card"><h2>Loading mission workspace</h2><p>Loading selected mission and saved evidence…</p></div>
    </section>
  </WorkspaceLayout>
}
