import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useActiveMission() {
  const [missionId, setMissionIdState] = useState<Id<'missions'> | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const stored = window.sessionStorage.getItem('nexus-forge-active-mission')
    if (stored) setMissionIdState(stored as Id<'missions'>)
    setLoaded(true)
  }, [])
  const setMissionId = (id: Id<'missions'> | null) => {
    setMissionIdState(id)
    if (typeof window !== 'undefined') {
      if (id) window.sessionStorage.setItem('nexus-forge-active-mission', id)
      else window.sessionStorage.removeItem('nexus-forge-active-mission')
    }
  }
  const mission = useQuery(api.missions.getById, missionId ? { id: missionId } : 'skip')
  // A saved session can outlive a deleted or inaccessible mission. Clear that stale
  // selection once Convex resolves it to null so pages can return to the empty state.
  useEffect(() => {
    if (missionId && mission === null) {
      setMissionIdState(null)
      if (typeof window !== 'undefined') window.sessionStorage.removeItem('nexus-forge-active-mission')
    }
  }, [missionId, mission])
  const research = useQuery(api.research.list, missionId ? { missionId } : 'skip')
  const agents = useQuery(api.forge.listRuns, missionId ? { missionId } : 'skip')
  const artifacts = useQuery(api.artifacts.list, missionId ? { missionId } : 'skip')
  const deliveries = useQuery(api.delivery.list, missionId ? { missionId } : 'skip')
  const councilComplete = !!agents?.length && agents.every(run => run.status === 'complete')
  const hasResearch = !!research?.length
  const hasVerifiedArtifact = !!artifacts?.some(item => item.status === 'verified' || item.status === 'ready')
  const hasApprovedArtifact = !!artifacts?.some(item => item.status === 'ready')
  const hasApprovedDelivery = !!deliveries?.some(item => item.approved && ['github', 'test', 'build', 'deploy', 'verified', 'complete'].includes(item.stage))
  return { missionId, setMissionId, loaded, mission, research: research ?? [], agents: agents ?? [], artifacts: artifacts ?? [], deliveries: deliveries ?? [], councilComplete, hasResearch, hasVerifiedArtifact, hasApprovedArtifact, hasApprovedDelivery }
}
