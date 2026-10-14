import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryBrowser } from '../src/components/memory-browser'
import type { Id } from '../convex/_generated/dataModel'
const state = vi.hoisted(() => ({ query: vi.fn(), loadMore: vi.fn(), status: 'LoadingFirstPage', rows: [] as any[] }))
vi.mock('convex/react', () => ({ usePaginatedQuery: (...args: any[]) => { state.query(...args); return { results: state.rows, status: state.status, loadMore: state.loadMore } } }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }))
const missionId = 'mission-test' as Id<'missions'>
beforeEach(() => { cleanup(); vi.clearAllMocks(); state.status = 'LoadingFirstPage'; state.rows = [] })
describe('memory browser guidance and retrieval', () => {
  it('shows loading rather than an empty memory claim', () => {
    render(<MemoryBrowser missionId={missionId} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading saved memory')
    expect(screen.queryByText(/No memory is linked/)).not.toBeInTheDocument()
  })
  it('submits content search with mission and category filters, then clears it', () => {
    state.status = 'Exhausted'
    render(<MemoryBrowser missionId={missionId} />)
    fireEvent.change(screen.getByLabelText('CATEGORY'), { target: { value: 'learning-lesson' } })
    fireEvent.change(screen.getByLabelText('SEARCH MEMORY CONTENT'), { target: { value: '  recovery evidence  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search memories' }))
    expect(state.query.mock.lastCall?.[1]).toEqual({ missionId, category: 'learning-lesson', search: 'recovery evidence' })
    expect(screen.getByText(/No memory matches these filters/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(state.query.mock.lastCall?.[1]).toEqual({ missionId, category: 'learning-lesson' })
  })
  it('can retrieve all owned memory without a selected mission', () => {
    state.status = 'Exhausted'
    render(<MemoryBrowser missionId={null} />)
    expect(screen.getByLabelText('MEMORY SCOPE')).toHaveValue('all')
    expect(state.query.mock.lastCall?.[1]).toEqual({})
    expect(screen.getByRole('option', { name: 'Selected mission' })).toBeDisabled()
  })
  it('shows saved provenance and complete contents, and loads another page', () => {
    state.status = 'CanLoadMore'
    state.rows = [{ _id: 'memory-1', _creationTime: 1, key: 'measurement:1', category: 'learning-lesson', value: JSON.stringify({ lesson: 'Review the actual deployment outcome.' }), source: 'verified-measurement', confidence: 0.75, missionId }]
    render(<MemoryBrowser missionId={missionId} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Review the actual deployment outcome.')).toBeInTheDocument()
    expect(screen.getByText(/Source: verified-measurement/)).toBeInTheDocument()
    expect(screen.getByText(/Receipt: memory-1/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Load more memory' }))
    expect(state.loadMore).toHaveBeenCalledWith(10)
    fireEvent.change(screen.getByLabelText('MEMORY SCOPE'), { target: { value: 'all' } })
    expect(state.query.mock.lastCall?.[1]).toEqual({})
  })
})
