import { describe, expect, it } from 'vitest'
import { derivePageState } from '../src/lib/page-progress'
import { guidedWorkspaces } from '../src/lib/workspaces'

describe('sixteen-page progress states', () => {
  it('classifies every registered guide page without treating optional tools as missing evidence', () => {
    expect(guidedWorkspaces).toHaveLength(16)
    for (const page of guidedWorkspaces) {
      expect(['REFERENCE', 'OPTIONAL', 'WAITING', 'READY']).toContain(derivePageState(page.path, {}, '/mission'))
    }
    expect(derivePageState('/manifest', {}, '/mission')).toBe('OPTIONAL')
    expect(derivePageState('/roadmap', {}, '/mission')).toBe('REFERENCE')
    expect(derivePageState('/mission', {}, '/mission')).toBe('READY')
    expect(derivePageState('/artifacts', {}, '/mission')).toBe('WAITING')
  })

  it('shows loading before completion and recovery before historical success', () => {
    const evidence = { '/delivery': true }
    expect(derivePageState('/delivery', evidence, '/delivery', true, true)).toBe('LOADING')
    expect(derivePageState('/delivery', evidence, '/delivery', true)).toBe('BLOCKED')
    expect(derivePageState('/delivery', evidence)).toBe('COMPLETE')
    expect(derivePageState('/learning', {})).toBe('OPTIONAL')
  })
})
