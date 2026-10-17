import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlatformTaskPerformance } from '../src/components/platform-task-performance'
const mock = vi.hoisted(() => ({ summary: undefined as any }))
vi.mock('convex/react', () => ({ useQuery: () => mock.summary }))
describe('platform performance evidence states', () => {
  it('distinguishes loading, no measurements and zero success', () => {
    mock.summary = undefined
    const view = render(<PlatformTaskPerformance missionId={null}/>)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    mock.summary = { sampled: 0, truncated: false, rows: [{ kind: 'research', successes: 0, failures: 0, pending: 0, successRate: null, meanSeconds: null, timedCount: 0 }] }
    view.rerender(<PlatformTaskPerformance missionId={null}/>)
    expect(screen.getByText(/No measured platform tasks yet/)).toBeInTheDocument()
    expect(screen.getByText(/Success rate: Not measured/)).toBeInTheDocument()
    mock.summary = { sampled: 1, truncated: false, rows: [{ kind: 'research', successes: 0, failures: 1, pending: 0, successRate: 0, meanSeconds: 2, timedCount: 1 }] }
    view.rerender(<PlatformTaskPerformance missionId={null}/>)
    expect(screen.getByText(/Success rate: 0.0%/)).toBeInTheDocument()
  })
  it('exposes the bounded sample and unresolved denominator', () => {
    mock.summary = { sampled: 100, truncated: true, rows: [{ kind: 'delivery', successes: 1, failures: 0, pending: 99, successRate: 100, meanSeconds: 3, timedCount: 1 }] }
    render(<PlatformTaskPerformance missionId={null}/>)
    expect(screen.getByText(/Showing the latest 100 recorded attempts/)).toBeInTheDocument()
    expect(screen.getByText(/99 pending/)).toBeInTheDocument()
    expect(screen.getByText(/pending work is unresolved and excluded/)).toBeInTheDocument()
  })
})
