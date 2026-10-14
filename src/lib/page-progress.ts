export type PageState = 'LOADING' | 'COMPLETE' | 'READY' | 'BLOCKED' | 'WAITING' | 'OPTIONAL' | 'REFERENCE'

export function derivePageState(path: string, evidence: Record<string, boolean>, nextPath?: string, blocked = false, loading = false): PageState {
  if (loading) return 'LOADING'
  if (path === nextPath && blocked) return 'BLOCKED'
  if (evidence[path]) return 'COMPLETE'
  if (path === nextPath) return 'READY'
  if (['/', '/roadmap'].includes(path)) return 'REFERENCE'
  if (['/manifest', '/orchestrator', '/providers', '/capabilities', '/incidents', '/learning', '/portfolio'].includes(path)) return 'OPTIONAL'
  return 'WAITING'
}
