import { describe, expect, it } from 'vitest'
import { CATEGORY_BG_CLASS } from './categoryColors'
import { CATEGORY_OPTIONS } from '../components/CategoryIcon'

describe('CATEGORY_BG_CLASS', () => {
  it('has a bg-cat-* class for every category option', () => {
    for (const category of CATEGORY_OPTIONS) {
      expect(CATEGORY_BG_CLASS[category]).toBe(`bg-cat-${category}`)
    }
  })
})
