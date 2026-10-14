import { Link, useRouterState } from '@tanstack/react-router'
import { useMissionGuide } from '../lib/use-mission-guide'
import { allWorkspaces, primaryWorkspaces } from '../lib/workspaces'

export function WorkspaceGuide() {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const { missionId, mission, loaded, stages, nextStage, completed } = useMissionGuide()
  const page = allWorkspaces.find(item => item.path === pathname)
  const index = primaryWorkspaces.findIndex(item => item.path === pathname)
  const nextPage = primaryWorkspaces[index + 1]
  const loading = !loaded || (!!missionId && mission === undefined)
  return <section className="workspace-context" aria-label="Current workspace and next step">
    <div><span className="section-kicker">YOU ARE HERE · {page?.title ?? 'Workspace'}</span><p>{page?.purpose}</p><small>Expected output: {page?.output}</small></div>
    <div className="workspace-context-next" aria-live="polite">
      <span className="section-kicker">{loading ? 'LOADING MISSION' : mission?.title ?? 'START YOUR MISSION'}</span>
      <p>{loading ? 'Reading saved progress…' : nextStage?.title ?? 'Review outcome evidence'}</p>
      {!loading && <><small>{completed}/{stages.length} checkpoints recorded · {nextStage?.note}</small><div className="hero-actions">{nextStage?.path === pathname ? <a className="primary-button small" href="#workspace-controls">Continue on this page ↓</a> : <Link className="primary-button small" to={nextStage?.path ?? '/portfolio'}>Go to next mission step →</Link>}<Link className="secondary-button small" to="/workflow">View full guide →</Link></div></>}
    </div>
    <details><summary>Explore pages & support tools</summary><div className="hero-actions">{index > 0 && <Link className="secondary-button small" to={primaryWorkspaces[index - 1].path}>← {primaryWorkspaces[index - 1].title}</Link>}{nextPage && <Link className="secondary-button small" to={nextPage.path}>Next workspace: {nextPage.title} →</Link>}{allWorkspaces.filter(item => !primaryWorkspaces.includes(item)).map(item => <Link className="ghost-button" to={item.path} key={item.path}>{item.title} →</Link>)}</div><small>Page exploration is optional. The mission recommendation above follows saved prerequisites.</small></details>
  </section>
}
