import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import { CouncilMemoryInspection } from '../src/components/council-memory-inspection'
import type { Id } from '../convex/_generated/dataModel'
const mocks = vi.hoisted(() => ({ evaluate: vi.fn(), empty: false }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }))
vi.mock('convex/react', () => ({
  useMutation: () => mocks.evaluate,
  useQuery: (ref: Parameters<typeof getFunctionName>[0]) => getFunctionName(ref) === 'memory:councilMemoryEvaluations' || mocks.empty ? [] : [{ _id: 'context-one', status: 'prepared', selected: [{ memoryId: 'memory-one', key: 'Reviewed lesson', category: 'learning-lesson', source: 'reviewed', routes: ['learning-lesson', 'adaptive-reuse'], value: 'Captured original lesson' }], policyVersion: 'council-recent-context-v1', preparedAt: 1000, missionText: 'Saved mission', learningContext: 'Exact learning text', preflightContext: 'Exact preflight text' }],
}))
beforeEach(() => { mocks.evaluate.mockReset(); mocks.empty = false })
const missionId = 'mission-one' as Id<'missions'>
function fill() {
  fireEvent.change(screen.getByLabelText('EXPECTED MEMORY RECEIPTS · ONE PER LINE · 1–20'), { target: { value: 'memory-one\nmemory-two' } })
  fireEvent.change(screen.getByLabelText('WHY THESE MEMORIES ARE RELEVANT'), { target: { value: 'These records contain relevant bounded planning lessons.' } })
}
describe('Council context inspection and evaluation', () => {
  it('distinguishes prepared from responded and submits reference-only operator labels explicitly', async () => {
    mocks.evaluate.mockResolvedValue('evaluation-one')
    render(<CouncilMemoryInspection missionId={missionId} />)
    expect(mocks.evaluate).not.toHaveBeenCalled()
    expect(screen.getByText(/Prepared · no planner response confirmed/)).toBeInTheDocument()
    expect(screen.getByText('Exact learning text')).toBeInTheDocument()
    fill(); fireEvent.submit(screen.getByLabelText('EXPECTED MEMORY RECEIPTS · ONE PER LINE · 1–20').closest('form')!)
    await waitFor(() => expect(mocks.evaluate).toHaveBeenCalledWith({ receiptId: 'context-one', expectedIds: ['memory-one', 'memory-two'], rationale: 'These records contain relevant bounded planning lessons.' }))
    expect(await screen.findByRole('status')).toHaveTextContent('evaluation-one')
  })
  it('preserves labels after failed validation and offers an honest empty state', async () => {
    mocks.evaluate.mockRejectedValue(new Error('Expected memory is outside your private scope.'))
    const view = render(<CouncilMemoryInspection missionId={missionId} />); fill()
    fireEvent.submit(screen.getByLabelText('EXPECTED MEMORY RECEIPTS · ONE PER LINE · 1–20').closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('private scope')
    expect(screen.getByLabelText('EXPECTED MEMORY RECEIPTS · ONE PER LINE · 1–20')).toHaveValue('memory-one\nmemory-two')
    view.unmount(); mocks.empty = true; render(<CouncilMemoryInspection missionId={missionId} />)
    expect(screen.getByText(/No captured context for this mission yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Score captured Council memory selection' })).not.toBeInTheDocument()
  })
})
