import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ArtifactBrowserChecks } from '../src/components/artifact-browser-checks'
import type { Id } from '../convex/_generated/dataModel'
const state = vi.hoisted(() => ({ record: vi.fn(), history: [] as any[] }))
vi.mock('convex/react', () => ({ useMutation: () => state.record, useQuery: () => state.history }))
const artifact = { _id: 'artifact-test' as Id<'artifacts'>, content: '<p id="result">14</p>' }
const mission = 'ACCEPTANCE CRITERIA:\n- Show the correct result'
beforeEach(() => { cleanup(); vi.clearAllMocks(); state.history = []; state.record.mockResolvedValue('receipt-test') })
afterEach(() => { vi.useRealTimers(); cleanup() })
function configure() {
  fireEvent.click(screen.getByText('Browser checks against saved acceptance criteria'))
  fireEvent.click(screen.getByRole('button', { name: 'Add criterion check' }))
  fireEvent.change(screen.getByLabelText('CSS SELECTOR'), { target: { value: '#result' } })
  fireEvent.change(screen.getByLabelText('INPUT / EXPECTED VALUE'), { target: { value: '14' } })
  fireEvent.click(screen.getByRole('button', { name: 'Run browser checks & save evidence' }))
  const frame = screen.getByTitle('Isolated artifact test browser') as HTMLIFrameElement
  const nonce = frame.srcdoc.match(/const nonce=("[^"]*")/)?.[1]
  if (!nonce) throw new Error('No runner nonce')
  return { frame, nonce: JSON.parse(nonce) }
}
function report(frame: HTMLIFrameElement, nonce: string) {
  window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, data: { type: 'nexus-artifact-tests', nonce, results: [[{ status: 'pass', detail: 'Observed expected text: 14' }]] } }))
}
describe('artifact browser evidence UI', () => {
  it('requires explicit saved criteria instead of inventing a passing test', () => {
    render(<ArtifactBrowserChecks artifact={artifact} missionContract="Build a useful demo" />)
    expect(screen.getByText(/saved mission needs an explicit ACCEPTANCE CRITERIA/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Run browser checks & save evidence' })).not.toBeInTheDocument()
  })
  it('uses an opaque-origin frame and ignores a mismatched result challenge', async () => {
    render(<ArtifactBrowserChecks artifact={artifact} missionContract={mission} />)
    const { frame, nonce } = configure()
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts')
    act(() => report(frame, 'wrong-challenge'))
    expect(state.record).not.toHaveBeenCalled()
    act(() => report(frame, nonce))
    expect(await screen.findByRole('status')).toHaveTextContent('receipt-test')
    expect(state.record).toHaveBeenCalledWith(expect.objectContaining({ artifactId: artifact._id, missionSnapshot: mission, artifactSnapshot: artifact.content }))
    expect(screen.queryByTitle('Isolated artifact test browser')).not.toBeInTheDocument()
  })
  it('preserves completed evidence for retry after a failed save', async () => {
    state.record.mockRejectedValueOnce(new Error('Evidence save unavailable'))
    render(<ArtifactBrowserChecks artifact={artifact} missionContract={mission} />)
    const { frame, nonce } = configure()
    act(() => report(frame, nonce))
    expect(await screen.findByRole('alert')).toHaveTextContent('Evidence save unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving browser evidence' }))
    await waitFor(() => expect(state.record).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('status')).toHaveTextContent('Approval and delivery state are unchanged')
  })
  it('offers artifact ID hints and can load a saved criterion plan', () => {
    state.history = [{ _id: 'saved-report', allPassed: true, passed: 1, total: 1, covered: 1, failed: 0, notRun: 0, createdAt: 1, missionSnapshot: mission, artifactSnapshot: artifact.content, criteria: ['Show the correct result'], plan: [{ criterionIndex: 0, steps: [{ action: 'assertText', selector: '#result', value: '14' }] }], results: [[{ status: 'pass', detail: 'Observed 14' }]] }]
    render(<ArtifactBrowserChecks artifact={artifact} missionContract={mission} />)
    fireEvent.click(screen.getByText('Browser checks against saved acceptance criteria'))
    fireEvent.click(screen.getByText('Available ID selectors from this artifact'))
    expect(screen.getByText('#result')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Use saved test plan' }))
    expect(screen.getByLabelText('CSS SELECTOR')).toHaveValue('#result')
    expect(screen.getByLabelText('INPUT / EXPECTED VALUE')).toHaveValue('14')
  })
  it('times out without recording a fabricated pass', () => {
    vi.useFakeTimers()
    render(<ArtifactBrowserChecks artifact={artifact} missionContract={mission} />)
    configure()
    act(() => vi.advanceTimersByTime(25000))
    expect(screen.getByRole('alert')).toHaveTextContent('No passing result was saved')
    expect(state.record).not.toHaveBeenCalled()
  })
})
