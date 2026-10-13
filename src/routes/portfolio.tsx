import { createFileRoute, Link } from '@tanstack/react-router'
import { PortfolioIntelligence } from '../components/portfolio-intelligence'
import { WorkspaceLayout } from '../components/workspace-layout'
import { useActiveMission } from '../hooks/use-active-mission'

export const Route = createFileRoute('/portfolio')({ component: PortfolioPage })

function PortfolioPage() {
  const { setMissionId } = useActiveMission()
  return <WorkspaceLayout title="Portfolio Intelligence" eyebrow="OPERATIONS / MISSION HISTORY & DECISIONS">
    <section className="workspace"><PortfolioIntelligence ownerKey="local-workspace" onSelect={id => { setMissionId(id as any) }} /><div className="hero-actions"><Link className="secondary-button" to="/mission">Open Mission Console →</Link></div></section>
  </WorkspaceLayout>
}
