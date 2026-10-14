import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import { MissionControl } from '../src/components/mission-control'
import type { Id } from '../convex/_generated/dataModel'

vi.mock('@tanstack/react-router', () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }))
vi.mock('convex/react', () => ({
  useQuery: (ref: any) => {
    const name = getFunctionName(ref)
    if (name === 'delivery:list') return [{ _id: 'delivery-test', stage: 'verified' }]
    if (name === 'missions:getById') return { title: 'Recovery mission', approved: true, status: 'running' }
    if (['artifacts:list', 'incidents:list', 'verification:list', 'verification:measurements', 'portfolio:listDecisions'].includes(name)) return []
    return undefined
  },
  useMutation: () => vi.fn().mockRejectedValue(new Error('Delivery evidence changed. Review before retrying.')),
  useAction: () => vi.fn(),
}))

describe('Mission Control recovery feedback', () => {
  it('shows outcome errors even when portfolio snapshots are unavailable and restores the button', async () => {
    render(<MissionControl missionId={'mission-test' as Id<'missions'>} />)
    const button = screen.getByRole('button', { name: 'Record outcome verification' })
    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('Delivery evidence changed')
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByRole('link', { name: 'Review delivery evidence →' })).toHaveAttribute('href', '/delivery')
    expect(screen.getByRole('link', { name: 'Review incidents →' })).toHaveAttribute('href', '/incidents')
  })
})
