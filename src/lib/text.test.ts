import { describe, expect, it } from 'vitest'
import { normalizeForSearch } from './text'

describe('normalizeForSearch', () => {
  it('lowercases and strips accents so accented and plain text match', () => {
    expect(normalizeForSearch('Café')).toBe('cafe')
    expect(normalizeForSearch('café')).toBe('cafe')
  })

  it('leaves plain ASCII lowercase text unchanged', () => {
    expect(normalizeForSearch('uber')).toBe('uber')
  })

  it('handles multiple accented characters', () => {
    expect(normalizeForSearch('Açaí não é Pão')).toBe('acai nao e pao')
  })
})
