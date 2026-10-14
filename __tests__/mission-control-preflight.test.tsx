import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import { MissionControl } from '../src/components/mission-control'
import type { Id } from '../convex/_generated/dataModel'

const state = vi.hoisted(() => ({ preflight: undefined as any, escalated: false }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }))
vi.mock('convex/react', () => ({
  useQuery: (ref: any) => {
    const name = getFunctionName(ref)
    if (name === 'missions:getById') return { _id: 'mission-test', title: 'Preflight mission', approved: true, status: 'draft' }
    if (name === 'orchestration:preflight') return state.preflight
    if (name === 'portfolio:decisionSnapshot') return { totalMissions: 1, completionRate: 0, blocked: 0, recommendation: 'review', priorities: [] }
    if (name === 'portfolio:listDecisions') return [{ decision: 'approve', action: 'Execute approved mission', priorityRank: 1 }]
    if (name === 'incidents:list') return state.escalated ? [{ _id: 'incident-test', status: 'escalated', stage: 'execution', message: 'Needs recovery' }] : []
    if (['artifacts:list', 'delivery:list', 'verification:list', 'verification:measurements'].includes(name)) return []
    return undefined
  },
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
}))
const ready = { ready: true, blockers: [], advisories: [], resources: [] }
beforeEach(() => { cleanup(); state.preflight = undefined; state.escalated = false })
describe('Mission Control execution preflight', () => {
  it('waits for preflight before enabling execution', () => {
    render(<MissionControl missionId={'mission-test' as Id<'missions'>} />)
    expect(screen.getByRole('button', { name: 'Execute Approved Mission' })).toBeDisabled()
    expect(screen.getByText('Loading dependency and resource preflight…')).toBeInTheDocument()
  })
  it('displays a resource blocker and keeps execution disabled', () => {
    state.preflight = { ...ready, ready: false, blockers: ['Deployment resource is held'], resources: [{ key: 'deployment', mode: 'exclusive', available: false, heldByMission: 'other-mission' }] }
    render(<MissionControl missionId={'mission-test' as Id<'missions'>} />)
    expect(screen.getByText('Deployment resource is held')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Execute Approved Mission' })).toBeDisabled()
  })
  it('enables execution only after preflight is ready', () => {
    state.preflight = ready
    render(<MissionControl missionId={'mission-test' as Id<'missions'>} />)
    expect(screen.getByRole('button', { name: 'Execute Approved Mission' })).toBeEnabled()
  })
  it('retains the incident gate even with ready resources', () => {
    state.preflight = ready; state.escalated = true
    render(<MissionControl missionId={'mission-test' as Id<'missions'>} />)
    expect(screen.getByRole('button', { name: 'Execute Approved Mission' })).toBeDisabled()
  })
})
