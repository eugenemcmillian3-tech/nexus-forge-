import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

const STORAGE_KEY = 'nexus-forge-active-mission'

export function useActiveMission() {
  const [missionId, setMissionIdState] = useState<Id<'missions'> | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (stored) setMissionIdState(stored as Id<'missions'>)
    setLoaded(true)
  }, [])

  const setMissionId = (id: Id<'missions'> | null) => {
    setMissionIdState(id)
    if (typeof window !== 'undefined') {
      if (id) window.sessionStorage.setItem(STORAGE_KEY, id)
      else window.sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  const mission = useQuery(api.missions.getById, missionId ? { id: missionId } : 'skip')
  useEffect(() => {
    if (missionId && mission === null) {
      setMissionIdState(null)
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY)
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

  return {
    missionId, setMissionId, loaded, mission,
    research: research ?? [], agents: agents ?? [], artifacts: artifacts ?? [], deliveries: deliveries ?? [],
    councilComplete, hasResearch, hasVerifiedArtifact, hasApprovedArtifact, hasApprovedDelivery,
  }
}
