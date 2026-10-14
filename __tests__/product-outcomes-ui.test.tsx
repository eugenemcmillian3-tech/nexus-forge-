import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProductOutcomeMeasurements } from '../src/components/product-outcome-measurements'
import type { Id } from '../convex/_generated/dataModel'
const mocks = vi.hoisted(() => ({ record: vi.fn(), loadMore: vi.fn() }))
vi.mock('convex/react', () => ({ useMutation: () => mocks.record, usePaginatedQuery: () => ({ results: [], status: 'Exhausted', loadMore: mocks.loadMore }) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }))
beforeEach(() => { mocks.record.mockReset() })
const missionId = 'mission-one' as Id<'missions'>
function fill() {
  fireEvent.change(screen.getByLabelText('OBSERVED VALUE · people'), { target: { value: '8' } })
  fireEvent.change(screen.getByLabelText('TARGET · people'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('SAMPLE SIZE · PEOPLE OR EVENTS OBSERVED'), { target: { value: '20' } })
  fireEvent.change(screen.getByLabelText('OBSERVATION START · LOCAL TIME'), { target: { value: '2026-10-10T09:00' } })
  fireEvent.change(screen.getByLabelText('OBSERVATION END · LOCAL TIME'), { target: { value: '2026-10-11T09:00' } })
  fireEvent.change(screen.getByLabelText('MEASUREMENT METHOD & METRIC DEFINITION'), { target: { value: 'Count unique pilot users from an analytics export.' } })
  fireEvent.change(screen.getByLabelText('EVIDENCE REFERENCES · ONE PER LINE · 1–8'), { target: { value: 'Analytics export receipt 123' } })
}
describe('explicit operator product measurements', () => {
  it('sends observations without claimed target status or owner and does not submit automatically', async () => {
    mocks.record.mockResolvedValue('outcome-one')
    render(<ProductOutcomeMeasurements missionId={missionId} />)
    expect(mocks.record).not.toHaveBeenCalled(); fill()
    fireEvent.submit(screen.getByRole('button', { name: 'Save product outcome observation' }).closest('form')!)
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith({ missionId, metric: 'active-users', observed: 8, target: 10, sampleSize: 20, periodStart: new Date('2026-10-10T09:00').getTime(), periodEnd: new Date('2026-10-11T09:00').getTime(), method: 'Count unique pilot users from an analytics export.', evidence: ['Analytics export receipt 123'], notes: '' }))
    expect(await screen.findByRole('status')).toHaveTextContent('operator-recorded product outcome')
  })
  it('preserves input and restores saving after rejected evidence', async () => {
    mocks.record.mockRejectedValue(new Error('Choose a completed observation period.'))
    render(<ProductOutcomeMeasurements missionId={missionId} />); fill()
    fireEvent.submit(screen.getByRole('button', { name: 'Save product outcome observation' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('completed observation period')
    expect(screen.getByLabelText('OBSERVED VALUE · people')).toHaveValue(8)
    expect(screen.getByRole('button', { name: 'Save product outcome observation' })).toBeEnabled()
  })
  it('guides missing mission selection without offering a recording form', () => {
    render(<ProductOutcomeMeasurements missionId={null} />)
    expect(screen.getByRole('link', { name: /Select a mission to record/ })).toHaveAttribute('href', '/mission')
    expect(screen.queryByRole('button', { name: 'Save product outcome observation' })).not.toBeInTheDocument()
  })
})
