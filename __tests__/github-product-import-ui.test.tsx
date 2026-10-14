import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GitHubProductImport } from '../src/components/github-product-import'
import type { Id } from '../convex/_generated/dataModel'
const mocks = vi.hoisted(() => ({ importReport: vi.fn() }))
vi.mock('convex/react', () => ({ useAction: () => mocks.importReport }))
beforeEach(() => { mocks.importReport.mockReset() })
const missionId = 'mission-one' as Id<'missions'>
function fill() {
  fireEvent.change(screen.getByLabelText('REPORT ID'), { target: { value: 'pilot_1' } })
  fireEvent.change(screen.getByLabelText('EXACT SOURCE COMMIT SHA'), { target: { value: 'a'.repeat(40) } })
}
describe('explicit pinned GitHub report import', () => {
  it('discloses repository visibility and submits only source selectors after an explicit action', async () => {
    mocks.importReport.mockResolvedValue('import-one')
    render(<GitHubProductImport missionId={missionId} />)
    expect(mocks.importReport).not.toHaveBeenCalled()
    expect(screen.getByText(/Report content is visible to repository readers/)).toBeInTheDocument()
    fill(); fireEvent.submit(screen.getByLabelText('REPORT ID').closest('form')!)
    await waitFor(() => expect(mocks.importReport).toHaveBeenCalledWith({ missionId, commitSha: 'a'.repeat(40), reportId: 'pilot_1' }))
    expect(await screen.findByRole('status')).toHaveTextContent('import-one')
  })
  it('preserves source selectors and restores controls after lookup failure', async () => {
    mocks.importReport.mockRejectedValue(new Error('GitHub report lookup failed (HTTP 404).'))
    render(<GitHubProductImport missionId={missionId} />); fill()
    fireEvent.submit(screen.getByLabelText('REPORT ID').closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 404')
    expect(screen.getByLabelText('REPORT ID')).toHaveValue('pilot_1')
    expect(screen.getByRole('button', { name: 'Import pinned outcome report' })).toBeEnabled()
  })
})
