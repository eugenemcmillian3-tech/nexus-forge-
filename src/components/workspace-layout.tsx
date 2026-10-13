import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useEffect, useState } from 'react'
import { AuthWrapper } from './auth-wrapper'

const groups = [
  { label: 'WORKFLOW', items: [
    { to: '/', title: 'Overview', icon: '⌂' },
    { to: '/mission', title: 'Mission Console', icon: '◈' },
    { to: '/council', title: 'AI Council', icon: '◎' },
    { to: '/manifest', title: 'Manifest Intelligence', icon: '✧' },
    { to: '/orchestrator', title: 'Intelligence Orchestrator', icon: '⟁' },
    { to: '/learning', title: 'Verified Learning Engine', icon: '↻' },
    { to: '/evidence', title: 'Research & Memory', icon: '⌁' },
    { to: '/artifacts', title: 'Artifact Forge', icon: '▣' },
    { to: '/delivery', title: 'Delivery Pipeline', icon: '↗' },
  ]},
  { label: 'OPERATIONS', items: [
    { to: '/portfolio', title: 'Portfolio Intelligence', icon: '◇' },
    { to: '/incidents', title: 'Incident Center', icon: '!' },
    { to: '/capabilities', title: 'Capability & Reliability', icon: '▤' },
    { to: '/workflow', title: 'Autonomous Workflow', icon: '◌' },
    { to: '/providers', title: 'AI Providers', icon: '⌘' },
    { to: '/readiness', title: 'Launch Readiness', icon: '✓' },
    { to: '/roadmap', title: 'Master Roadmap', icon: '☷' },
  ]},
] as const

export function WorkspaceLayout({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const router = useRouter()
  const { signOut } = useAuthActions()
  const [missionId, setMissionId] = useState('')
  useEffect(() => { setMissionId(window.sessionStorage.getItem('nexus-forge-active-mission') ?? '') }, [pathname])
  return <AuthWrapper><main className="min-h-screen nexus-shell has-sidebar workspace-app-shell">
    <aside className="nexus-sidebar" aria-label="NEXUS FORGE navigation">
      <Link to="/" className="sidebar-brand"><div className="brand-mark">N</div><div><strong>NEXUS</strong><small>FORGE OS</small></div></Link>
      <nav className="sidebar-nav">{groups.map(group => <div key={group.label}><div className="sidebar-group-label">{group.label}</div>{group.items.map(item => <Link key={item.to} to={item.to} className={`sidebar-link ${pathname === item.to ? 'active' : ''}`}><span>{item.icon}</span><span>{item.title}</span></Link>)}</div>)}</nav>
      <div className="sidebar-footer"><span className="pulse-dot" /><div><strong>CORE ONLINE</strong><small>{missionId ? 'Mission selected' : 'No active mission'}</small></div></div>
    </aside>
    <div className="workspace-page-content">
      <header className="topbar"><div className="brand-lockup"><div className="brand-mark">N</div><div><div className="brand-name">NEXUS FORGE</div><div className="brand-sub">GOVERNED INTELLIGENCE OS</div></div></div><div className="top-actions"><span className="live-pill"><span className="pulse-dot" /> CORE ONLINE</span><button className="profile-button" type="button" onClick={() => { window.sessionStorage.removeItem('nexus-forge-active-mission'); void signOut().then(() => { void router.navigate({ to: '/', replace: true }) }) }}>Sign out</button></div></header>
      <section className="page-heading"><div className="section-kicker">{eyebrow}</div><h1>{title}</h1><p>Each workspace is a dedicated page. Follow the governed sequence; later stages stay locked until their prerequisites are met.</p></section>
      {children}
    </div>
  </main></AuthWrapper>
}
