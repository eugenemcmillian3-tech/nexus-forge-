import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import { ArtifactCiControls } from '../src/components/artifact-ci-controls'
import type { Id } from '../convex/_generated/dataModel'
const state = vi.hoisted(() => ({ publish: vi.fn(), importRun: vi.fn() }))
vi.mock('convex/react', () => ({ useAction: (ref: any) => getFunctionName(ref) === 'artifactCiActions:publish' ? state.publish : state.importRun }))
const testRunId = 'saved-run' as Id<'artifactTestRuns'>
const ci = { branch: 'nexus-forge-checks/saved-run', commitSha: 'a'.repeat(40), snapshotSha: 'c'.repeat(64), dispatchedAt: 1 }
beforeEach(() => { cleanup(); vi.clearAllMocks(); state.publish.mockResolvedValue({ workflowUrl: 'https://github.com/eugenemcmillian3-tech/nexus-forge-/actions' }); state.importRun.mockResolvedValue(null) })
describe('exact artifact CI controls', () => {
  it('makes external snapshot publication explicit and never starts on render', async () => {
    render(<ArtifactCiControls testRunId={testRunId} current />)
    expect(screen.getByText(/Publishing sends the artifact content, mission text, and test plan/)).toBeInTheDocument()
    expect(state.publish).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Publish saved snapshot & run CI' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Snapshot published and CI dispatch requested')
    expect(state.publish).toHaveBeenCalledWith({ testRunId, publishSnapshot: true })
  })
  it('blocks historical snapshot publication and recovers from a failed dispatch', async () => {
    const view = render(<ArtifactCiControls testRunId={testRunId} current={false} />)
    expect(screen.getByRole('button', { name: 'Publish saved snapshot & run CI' })).toBeDisabled()
    view.rerender(<ArtifactCiControls testRunId={testRunId} current />)
    state.publish.mockRejectedValueOnce(new Error('GitHub temporarily unavailable'))
    fireEvent.click(screen.getByRole('button', { name: 'Publish saved snapshot & run CI' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub temporarily unavailable')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish saved snapshot & run CI' })).toBeEnabled())
  })
  it('submits a run URL for server verification without client-supplied result claims', async () => {
    render(<ArtifactCiControls testRunId={testRunId} ci={ci} current />)
    const runUrl = 'https://github.com/eugenemcmillian3-tech/nexus-forge-/actions/runs/123'
    fireEvent.change(screen.getByLabelText('COMPLETED EXACT-SNAPSHOT CI RUN URL'), { target: { value: runUrl } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify & save exact CI report' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Matching GitHub CI report verified')
    expect(state.importRun).toHaveBeenCalledWith({ testRunId, runUrl })
  })
})
