import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExecutionReview } from '../src/components/execution-review'
import type { Id } from '../convex/_generated/dataModel'
const state = vi.hoisted(() => ({ evidence: undefined as any, record: vi.fn() }))
vi.mock('convex/react', () => ({ useQuery: () => state.evidence, useMutation: () => state.record }))
beforeEach(() => {
  state.record.mockReset().mockResolvedValue(null)
  state.evidence = { status: 'uncertain', scope: 'council', context: null, lastReview: null, invocations: [], effectsTruncated: false, invocationsTruncated: false, evidenceToken: 'current-evidence', effectCount: 0, providerScope: 'unattributed-direct-or-missing-run' }
})
describe('execution evidence review', () => {
  it('confirms only retained completion without authorizing new execution', async () => {
    state.evidence = { ...state.evidence, completionBlock: null }
    render(<ExecutionReview claimId={'claim-test' as Id<'executionClaims'>} />)
    fireEvent.change(screen.getByLabelText('Recovery decision'), { target: { value: 'confirm-completion' } })
    expect(screen.getByText(/does not start inference/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Evidence reviewed and next investigation'), { target: { value: 'Verified saved final outcome and all eight durable answers.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm saved completion' }))
    expect(await screen.findByText(/No inference or workflow advance was scheduled/)).toBeInTheDocument()
    expect(state.record.mock.calls[0][0].decision).toBe('confirm-completion')
  })
  it('offers a separate deliberate authorization only for proven unstarted work', async () => {
    state.evidence = { ...state.evidence, retryBlock: null }
    render(<ExecutionReview claimId={'claim-test' as Id<'executionClaims'>} />)
    fireEvent.change(screen.getByLabelText('Recovery decision'), { target: { value: 'retry-unstarted' } })
    expect(screen.getByText(/Provider inference may start/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Evidence reviewed and next investigation'), { target: { value: 'Verified zero provider admission and no Council effects.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Authorize unstarted retry' }))
    expect(await screen.findByText(/Unstarted retry authorized/)).toBeInTheDocument()
    expect(state.record.mock.calls[0][0].decision).toBe('retry-unstarted')
  })
  it('submits a deliberate review and confirms reservation stays blocked', async () => {
    render(<ExecutionReview claimId={'claim-test' as Id<'executionClaims'>} />)
    const button = screen.getByRole('button', { name: 'Record recovery decision' })
    expect(button).toBeDisabled()
    expect(screen.getByText(/cannot be attributed/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Evidence reviewed and next investigation'), { target: { value: 'Investigate pending provider work before any retry.' } })
    fireEvent.change(screen.getByLabelText('Recovery decision'), { target: { value: 'escalate' } })
    fireEvent.click(button)
    expect(await screen.findByText('Review recorded. Execution remains blocked.')).toBeInTheDocument()
    expect(state.record).toHaveBeenCalledWith({ claimId: 'claim-test', evidenceToken: 'current-evidence', decision: 'escalate', note: 'Investigate pending provider work before any retry.' })
    expect(screen.queryByRole('button', { name: /resume|reset|replay/i })).not.toBeInTheDocument()
  })
  it('keeps a failed review editable and does not offer decisions on active work', async () => {
    state.record.mockRejectedValueOnce(new Error('Execution evidence changed. Review current evidence.'))
    const view = render(<ExecutionReview claimId={'claim-test' as Id<'executionClaims'>} />)
    fireEvent.change(screen.getByLabelText('Evidence reviewed and next investigation'), { target: { value: 'Review the changed provider ledger before continuing.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Record recovery decision' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('evidence changed')
    expect(screen.getByRole('button', { name: 'Record recovery decision' })).toBeEnabled()
    state.evidence = { ...state.evidence, status: 'running' }
    view.rerender(<ExecutionReview claimId={'claim-test' as Id<'executionClaims'>} />)
    expect(screen.queryByRole('button', { name: 'Record recovery decision' })).not.toBeInTheDocument()
    expect(screen.getByText(/Work is active/)).toBeInTheDocument()
  })
  it('distinguishes reused stages from remaining provider work before deliberate continuation', async () => {
    state.evidence = { ...state.evidence, continuationBlock: null, reusableStages: 2, remainingStages: 6 }
    render(<ExecutionReview claimId={'claim-test' as Id<'executionClaims'>} />)
    fireEvent.change(screen.getByLabelText('Recovery decision'), { target: { value: 'continue-saved' } })
    expect(screen.getByText(/reuse 2 saved stage/)).toHaveTextContent('allow up to 6 unstarted Council stage')
    fireEvent.change(screen.getByLabelText('Evidence reviewed and next investigation'), { target: { value: 'Reviewed saved inputs, durable answers and original execution bounds.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue saved Council work' }))
    expect(await screen.findByText(/Saved-work continuation authorized/)).toBeInTheDocument()
    expect(state.record.mock.calls[0][0].decision).toBe('continue-saved')
  })

})
