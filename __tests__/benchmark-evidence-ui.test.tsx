import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ArtifactBenchmarkEvidence } from '../src/components/artifact-benchmark-evidence'
const state = vi.hoisted(() => ({ history: undefined as any, verify: vi.fn() }))
vi.mock('convex/react', () => ({ useQuery: () => state.history, useAction: () => state.verify }))
const runUrl = 'https://github.com/nexus-forge1/nexus-forge-/actions/runs/12345678'
beforeEach(() => { cleanup(); vi.clearAllMocks(); state.history = undefined; state.verify.mockResolvedValue('receipt-test') })
describe('capability benchmark evidence', () => {
  it('separates defined fixtures from recorded CI evidence', () => {
    render(<ArtifactBenchmarkEvidence />)
    expect(screen.getByText(/repeatable suite of 20 controlled DOM fixtures/)).toBeInTheDocument()
    expect(screen.getByText(/Both engines must match the expected outcomes/)).toBeInTheDocument()
    expect(screen.getByText('Loading saved CI evidence…')).toBeInTheDocument()
    expect(screen.queryByText(/No verified CI receipt saved/)).not.toBeInTheDocument()
  })
  it('preserves the run URL and restores controls after lookup failure', async () => {
    state.history = []; state.verify.mockRejectedValueOnce(new Error('Run is not complete'))
    render(<ArtifactBenchmarkEvidence />)
    fireEvent.change(screen.getByLabelText('COMPLETED NEXUS FORGE CI RUN URL'), { target: { value: runUrl } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify CI run & save receipt' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Run is not complete')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verify CI run & save receipt' })).toBeEnabled())
    expect(screen.getByLabelText('COMPLETED NEXUS FORGE CI RUN URL')).toHaveValue(runUrl)
  })
  it('imports by run URL without browser-supplied pass counts', async () => {
    state.history = []
    render(<ArtifactBenchmarkEvidence />)
    fireEvent.change(screen.getByLabelText('COMPLETED NEXUS FORGE CI RUN URL'), { target: { value: runUrl } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify CI run & save receipt' }))
    expect(await screen.findByRole('status')).toHaveTextContent('receipt-test')
    expect(state.verify).toHaveBeenCalledWith({ runUrl })
  })
})
