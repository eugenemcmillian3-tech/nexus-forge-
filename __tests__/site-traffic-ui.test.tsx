import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SiteTrafficEvidence } from '../src/components/site-traffic-evidence'
import type { Id } from '../convex/_generated/dataModel'
const mocks = vi.hoisted(() => ({ retrieve: vi.fn() }))
vi.mock('convex/react', () => ({ useAction: () => mocks.retrieve, usePaginatedQuery: () => ({ results: [], status: 'Exhausted', loadMore: vi.fn() }) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }))
beforeEach(() => { mocks.retrieve.mockReset() })
const missionId = 'mission-one' as Id<'missions'>
function fill() {
  fireEvent.change(screen.getByLabelText('TRAFFIC PERIOD START · LOCAL TIME'), { target: { value: '2026-10-10T09:00' } })
  fireEvent.change(screen.getByLabelText('TRAFFIC PERIOD END · LOCAL TIME'), { target: { value: '2026-10-11T09:00' } })
}
describe('explicit site-wide traffic retrieval', () => {
  it('requires scope acknowledgement and submits only period/context references', async () => {
    mocks.retrieve.mockResolvedValue('traffic-one')
    render(<SiteTrafficEvidence missionId={missionId} />); fill()
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Retrieve & save site traffic evidence' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.submit(screen.getByLabelText('TRAFFIC PERIOD START · LOCAL TIME').closest('form')!)
    await waitFor(() => expect(mocks.retrieve).toHaveBeenCalledWith({ missionId, periodStart: new Date('2026-10-10T09:00').getTime(), periodEnd: new Date('2026-10-11T09:00').getTime(), acknowledgeSiteScope: true }))
    expect(await screen.findByRole('status')).toHaveTextContent('traffic-one')
  })
  it('preserves period selections after connection errors', async () => {
    mocks.retrieve.mockRejectedValue(new Error('Managed analytics lookup failed (HTTP 403).'))
    render(<SiteTrafficEvidence missionId={missionId} />); fill(); fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.submit(screen.getByLabelText('TRAFFIC PERIOD START · LOCAL TIME').closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 403')
    expect(screen.getByLabelText('TRAFFIC PERIOD START · LOCAL TIME')).toHaveValue('2026-10-10T09:00')
    expect(screen.getByRole('button', { name: 'Retrieve & save site traffic evidence' })).toBeEnabled()
  })
})
