import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRetrievalEvaluation } from '../src/components/memory-retrieval-evaluation'
const mocks = vi.hoisted(() => ({ evaluate: vi.fn(), history: [] as Array<{ _id: string; value: string }> }))
vi.mock('convex/react', () => ({ useAction: () => mocks.evaluate, useQuery: () => mocks.history }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }))
beforeEach(() => { mocks.evaluate.mockReset(); mocks.history = [] })
function fill() {
  fireEvent.change(screen.getByLabelText('SEARCH QUESTION'), { target: { value: 'Orchard' } })
  fireEvent.change(screen.getByLabelText(/EXPECTED RELEVANT/), { target: { value: 'lesson-one\nlesson-two' } })
  fireEvent.change(screen.getByLabelText(/WHY THESE LESSONS/), { target: { value: 'These lessons contain relevant measured outcomes.' } })
}
describe('explicit lesson retrieval evaluation', () => {
  it('does not run automatically and sends labels, never claimed scores', async () => {
    mocks.evaluate.mockResolvedValue('saved-evaluation')
    render(<MemoryRetrievalEvaluation missionId={null} />)
    expect(mocks.evaluate).not.toHaveBeenCalled()
    expect(screen.getByText(/Missing evidence is not a pass/)).toBeInTheDocument()
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Run & save retrieval comparison' }))
    await waitFor(() => expect(mocks.evaluate).toHaveBeenCalledWith({ search: 'Orchard', expectedIds: ['lesson-one', 'lesson-two'], rationale: 'These lessons contain relevant measured outcomes.' }))
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })
  it('preserves drafts and restores controls after a failed evaluation', async () => {
    mocks.evaluate.mockRejectedValue(new Error('Expected lesson not found'))
    render(<MemoryRetrievalEvaluation missionId={null} />)
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Run & save retrieval comparison' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Expected lesson not found')
    expect(screen.getByLabelText('SEARCH QUESTION')).toHaveValue('Orchard')
    expect(screen.getByRole('button', { name: 'Run & save retrieval comparison' })).toBeEnabled()
  })
})
