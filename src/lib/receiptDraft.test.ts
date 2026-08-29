import { describe, expect, it } from 'vitest'
import { buildExpenseDraft } from './receiptDraft'
import type { ScanReceiptResult } from './api'

function baseResult(overrides: Partial<ScanReceiptResult> = {}): ScanReceiptResult {
  return {
    merchantName: 'Padaria X',
    purchasedAt: '2026-03-05T12:00:00Z',
    category: 'groceries',
    description: 'Compras na padaria',
    notes: '1x Pão, 1x Leite',
    items: [],
    fees: 0,
    discounts: 0,
    total: 42.5,
    confidence: 'high',
    ...overrides,
  }
}

describe('buildExpenseDraft', () => {
  it('maps the scan result fields onto the draft', () => {
    const draft = buildExpenseDraft(baseResult())
    expect(draft.description).toBe('Compras na padaria')
    expect(draft.notes).toBe('1x Pão, 1x Leite')
    expect(draft.amount).toBe(42.5)
    expect(draft.category).toBe('groceries')
    expect(draft.date).toBe('2026-03-05')
    expect(draft.lowConfidence).toBe(false)
    expect(draft.split).toBeUndefined()
  })

  it('marks lowConfidence when confidence is low', () => {
    expect(buildExpenseDraft(baseResult({ confidence: 'low' })).lowConfidence).toBe(true)
  })

  it('trims blank notes down to undefined', () => {
    expect(buildExpenseDraft(baseResult({ notes: '   ' })).notes).toBeUndefined()
  })

  it('leaves date undefined when purchasedAt is absent', () => {
    expect(buildExpenseDraft(baseResult({ purchasedAt: '' })).date).toBeUndefined()
  })
})
