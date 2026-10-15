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
})
