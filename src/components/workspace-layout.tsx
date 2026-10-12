import { Link, useRouterState } from '@tanstack/react-router'
import { AuthWrapper } from './auth-wrapper'

const sections = [
  { label: 'WORKFLOW', items: [
    { to: '/', title: 'Overview', icon: '⌂' },
    { to: '/mission', title: 'Mission Console', icon: '◎' },
    { to: '/council', title: 'AI Council', icon: '◈' },
    { to: '/manifest', title: 'Manifest Intelligence', icon: '✧' },
    { to: '/orchestrator', title: 'Intelligence Orchestrator', icon: '⟁' },
    { to: '/evidence', title: 'Research & Memory', icon: '⌕' },
    { to: '/learning', title: 'Verified Learning Engine', icon: '↗' },
    { to: '/artifacts', title: 'Artifact Forge', icon: '◇' },
    { to: '/delivery', title: 'Delivery Pipeline', icon: '⇧' },
    { to: '/portfolio', title: 'Portfolio Intelligence', icon: '▦' },
    { to: '/workflow', title: 'Autonomous Workflow', icon: '⇢' },
    { to: '/providers', title: 'AI Providers', icon: '⌘' },
    { to: '/readiness', title: 'Launch Readiness', icon: '✓' },
    { to: '/incidents', title: 'Incident Center', icon: '!' },
    { to: '/capabilities', title: 'Capability & Reliability', icon: '⌁' },
    { to: '/roadmap', title: 'Master Roadmap', icon: '☷' },
  ] },
]

export function WorkspaceLayout({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  return <AuthWrapper>
    <main className="min-h-screen nexus-shell flex flex-col md:flex-row">
      <aside className="w-full md:w-64 md:min-h-screen md:sticky md:top-0 md:h-screen border-b md:border-b-0 md:border-r border-slate-800/15 bg-white/70 backdrop-blur-xl p-4 md:p-5 flex flex-col">
        <Link to="/" className="flex items-center gap-3 px-2 py-3 mb-5">
          <span className="brand-mark">N</span><span><strong className="block tracking-[.18em] text-sm">NEXUS</strong><small className="block text-slate-500 tracking-[.16em] text-[10px]">FORGE OS</small></span>
        </Link>
        <nav aria-label="NEXUS FORGE navigation" className="flex-1 space-y-5">
          {sections.map(section => <div key={section.label}>
            <div className="text-[10px] font-bold tracking-[.18em] text-slate-500 px-3 mb-2">{section.label}</div>
            {section.items.map(item => <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1 text-sm transition-colors ${pathname === item.to ? 'bg-slate-950 text-cyan-300 shadow-md' : 'text-slate-700 hover:bg-white'}`}><span aria-hidden="true">{item.icon}</span><span>{item.title}</span></Link>)}
          </div>)}
        </nav>
        <div className="mt-5 rounded-xl border border-emerald-700/15 bg-emerald-500/5 p-3 flex items-center gap-3"><span className="pulse-dot" /><span><strong className="block text-[10px] tracking-wider">CORE ONLINE</strong><small className="text-slate-500 text-[10px]">Governed workspace</small></span></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="topbar"><Link to="/" className="brand-lockup"><div className="brand-mark">N</div><div><div className="brand-name">NEXUS FORGE</div><div className="brand-sub">GOVERNED INTELLIGENCE OS</div></div></Link><div className="top-actions"><span className="live-pill"><span className="pulse-dot" /> WORKSPACE</span></div></header>
        <section className="workspace">
          <div className="section-kicker">{eyebrow}</div><h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-2">{title}</h1>
          <p className="hero-text">Dedicated workspace pages follow a governed sequence. Every destination is registered in the route tree and uses the shared governed shell.</p>
          {children}
        </section>
      </div>
    </main>
  </AuthWrapper>
}
