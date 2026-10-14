import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import { StrategyReuseOutcomes } from '../src/components/strategy-reuse-outcomes'
const mocks = vi.hoisted(() => ({ record: vi.fn(), linked: true }))
vi.mock('../src/hooks/use-active-mission', () => ({ useActiveMission: () => ({ missionId: 'reuse-mission', mission: { title: 'Reuse mission' } }) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }))
vi.mock('convex/react', () => ({
  useMutation: () => mocks.record,
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: { missionId?: string } | string) => {
    switch (getFunctionName(ref)) {
      case 'missionSources:list': return mocks.linked ? [{ sourceMemoryId: 'lesson-one', path: '/learning', key: 'Reviewed lesson' }] : []
      case 'missions:list': return { page: [{ _id: 'baseline-mission', title: 'Baseline mission' }] }
      case 'verification:measurements': return args === 'skip' ? undefined : [{ _id: typeof args === 'object' && args.missionId === 'baseline-mission' ? 'baseline-measure' : 'candidate-measure', metric: 'actual runtime cost', actual: 5, target: 25, unit: 'USD' }]
      case 'learningEngine:listReuseComparisons': return []
      default: return undefined
    }
  },
}))
beforeEach(() => { mocks.record.mockReset(); mocks.linked = true })
function fill() {
  fireEvent.change(screen.getByLabelText('REVIEWED SOURCE LESSON'), { target: { value: 'lesson-one' } })
  fireEvent.change(screen.getByLabelText('EARLIER BASELINE MISSION'), { target: { value: 'baseline-mission' } })
  fireEvent.change(screen.getByLabelText('BASELINE MEASUREMENT'), { target: { value: 'baseline-measure' } })
  fireEvent.change(screen.getByLabelText('SUBSEQUENT REUSE MEASUREMENT'), { target: { value: 'candidate-measure' } })
  fireEvent.change(screen.getByLabelText('HOW THE LESSON WAS APPLIED AND CONDITIONS WERE COMPARABLE'), { target: { value: 'Applied this lesson under equivalent measured conditions.' } })
}
describe('explicit strategy reuse outcome recording', () => {
  it('requires application attestation and sends only measurement references and operator notes', async () => {
    mocks.record.mockResolvedValue('comparison-one')
    render(<StrategyReuseOutcomes />)
    expect(mocks.record).not.toHaveBeenCalled()
    fill()
    expect(screen.getByRole('button', { name: 'Save observed reuse comparison' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Save observed reuse comparison' }))
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith({ missionId: 'reuse-mission', lessonId: 'lesson-one', baselineMeasurementId: 'baseline-measure', candidateMeasurementId: 'candidate-measure', applied: true, notes: 'Applied this lesson under equivalent measured conditions.' }))
    expect(await screen.findByRole('status')).toHaveTextContent('comparison-one')
  })
  it('restores controls and preserves notes after validation rejection', async () => {
    mocks.record.mockRejectedValue(new Error('Compare the same supported metric, unit and target.'))
    render(<StrategyReuseOutcomes />); fill(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Save observed reuse comparison' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('same supported metric')
    expect(screen.getByRole('button', { name: 'Save observed reuse comparison' })).toBeEnabled()
    expect(screen.getByLabelText('HOW THE LESSON WAS APPLIED AND CONDITIONS WERE COMPARABLE')).toHaveValue('Applied this lesson under equivalent measured conditions.')
  })
  it('guides missions without a reviewed handoff back to lesson creation', () => {
    mocks.linked = false; render(<StrategyReuseOutcomes />)
    expect(screen.getByRole('link', { name: /Continue to reviewed lesson handoff/ })).toHaveAttribute('href', '#reviewed-learning-memory')
    expect(screen.queryByRole('button', { name: 'Save observed reuse comparison' })).not.toBeInTheDocument()
  })
})
