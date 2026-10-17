import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProductInstrumentation } from '../src/components/product-instrumentation'
import { productEventsEndpoint } from '../src/lib/product-events-endpoint'
import type { Id } from '../convex/_generated/dataModel'
const mocks = vi.hoisted(() => ({ create: vi.fn(), sources: [] as unknown[] | undefined }))
vi.mock('convex/react', () => ({ useQuery: () => mocks.sources, useAction: () => mocks.create, useMutation: () => vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }))
beforeEach(() => { mocks.create.mockReset(); mocks.sources = []; vi.stubEnv('VITE_CONVEX_URL', 'https://example.eu-west-1.convex.cloud') })
afterEach(() => vi.unstubAllEnvs())
describe('product task setup', () => {
  it('derives HTTP site endpoints for ordinary and regional deployments', () => {
    expect(productEventsEndpoint('https://example.convex.cloud')).toBe('https://example.convex.site/product-events')
    expect(productEventsEndpoint('https://example.eu-west-1.convex.cloud')).toBe('https://example.eu-west-1.convex.site/product-events')
    for (const value of ['', 'http://example.convex.cloud', 'https://example.convex.cloud/path', 'https://example.convex.cloud?key=x', 'https://other.example', 'https://user:pass@example.convex.cloud']) expect(productEventsEndpoint(value)).toBeNull()
  })
  it('requires a selected mission and distinguishes loading from empty sources', () => {
    mocks.sources = undefined
    const view = render(<ProductInstrumentation/>)
    expect(screen.getByRole('link', { name: /Select a mission/ })).toHaveAttribute('href', '/mission')
    expect(screen.queryByRole('button', { name: 'Create task measurement source' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    mocks.sources = []; view.rerender(<ProductInstrumentation/>)
    expect(screen.getByText(/No task sources connected yet/)).toBeInTheDocument()
  })
  it('creates only on submission for the selected mission and displays the site endpoint', async () => {
    mocks.create.mockResolvedValue({ sourceId: 'source-one', token: 'one-time-test-token' })
    render(<ProductInstrumentation missionId={'mission-one' as Id<'missions'>} missionTitle="Pilot product"/>)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Owned mission ID')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Product source name'), { target: { value: '  Product server  ' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Create task measurement source' }).closest('form')!)
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ missionId: 'mission-one', name: 'Product server' }))
    expect(await screen.findByText('https://example.eu-west-1.convex.site/product-events')).toBeInTheDocument()
  })
  it('preserves the source name and permits recovery after rejected creation', async () => {
    mocks.create.mockRejectedValue(new Error('Source limit reached'))
    render(<ProductInstrumentation missionId={'mission-one' as Id<'missions'>}/>)
    fireEvent.change(screen.getByLabelText('Product source name'), { target: { value: 'Pilot server' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Create task measurement source' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('Source limit reached')
    expect(screen.getByLabelText('Product source name')).toHaveValue('Pilot server')
    expect(screen.getByRole('button', { name: 'Create task measurement source' })).toBeEnabled()
  })
})
