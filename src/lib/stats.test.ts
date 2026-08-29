import { describe, expect, it, vi } from 'vitest'
import {
  basisValue,
  categoryTotals,
  filterExpenses,
  monthlyByCategory,
  niceCeil,
} from './stats'
import type { Expense } from '../types'

let nextId = 0
function makeExpense(overrides: Partial<Expense> = {}): Expense {
  nextId += 1
  return {
    id: `e${nextId}`,
    friendId: 'f1',
    description: 'Compra',
    category: 'groceries',
    amount: 100,
    paidBy: 'me',
    splitType: 'equal',
    myShare: 50,
    friendShare: 50,
    date: '2026-06-15',
    createdAt: '2026-06-15T12:00:00Z',
    settled: false,
    ...overrides,
  }
}

describe('basisValue', () => {
  it('returns the total amount for "total" basis', () => {
    expect(basisValue(makeExpense({ amount: 100, myShare: 40 }), 'total')).toBe(100)
  })

  it('returns myShare for "mine" basis', () => {
    expect(basisValue(makeExpense({ amount: 100, myShare: 40 }), 'mine')).toBe(40)
  })
})

describe('filterExpenses', () => {
  it('filters by friendId', () => {
    const expenses = [makeExpense({ friendId: 'a' }), makeExpense({ friendId: 'b' })]
    expect(filterExpenses(expenses, { range: 'all', friendId: 'a' })).toHaveLength(1)
  })

  it('"all" friendId keeps everyone', () => {
    const expenses = [makeExpense({ friendId: 'a' }), makeExpense({ friendId: 'b' })]
    expect(filterExpenses(expenses, { range: 'all', friendId: 'all' })).toHaveLength(2)
  })

  it('filters out expenses before the range start', () => {
    vi.setSystemTime(new Date(2026, 5, 20)) // 2026-06-20
    const expenses = [makeExpense({ date: '2026-06-01' }), makeExpense({ date: '2026-04-01' })]
    const result = filterExpenses(expenses, { range: 'this_month', friendId: 'all' })
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-06-01')
    vi.useRealTimers()
  })

  it('"all" range keeps every date', () => {
    const expenses = [makeExpense({ date: '2020-01-01' }), makeExpense({ date: '2026-06-01' })]
    expect(filterExpenses(expenses, { range: 'all', friendId: 'all' })).toHaveLength(2)
  })

  it('ytd keeps only expenses from this calendar year', () => {
    vi.setSystemTime(new Date(2026, 5, 20))
    const expenses = [makeExpense({ date: '2026-01-05' }), makeExpense({ date: '2025-12-31' })]
    const result = filterExpenses(expenses, { range: 'ytd', friendId: 'all' })
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-01-05')
    vi.useRealTimers()
  })
})

describe('categoryTotals', () => {
  it('sums by category, sorted descending by value, with correct share', () => {
    const expenses = [
      makeExpense({ category: 'food', amount: 30, myShare: 30 }),
      makeExpense({ category: 'groceries', amount: 70, myShare: 70 }),
      makeExpense({ category: 'food', amount: 20, myShare: 20 }),
    ]
    const totals = categoryTotals(expenses, 'total')
    expect(totals).toHaveLength(2)
    expect(totals[0]).toMatchObject({ category: 'groceries', value: 70, count: 1 })
    expect(totals[1]).toMatchObject({ category: 'food', value: 50, count: 2 })
    expect(totals[0].share).toBeCloseTo(70 / 120)
    expect(totals[1].share).toBeCloseTo(50 / 120)
  })

  it('returns an empty array when given no expenses', () => {
    expect(categoryTotals([], 'total')).toEqual([])
  })

  it('uses myShare when basis is "mine"', () => {
    const totals = categoryTotals([makeExpense({ amount: 100, myShare: 25 })], 'mine')
    expect(totals[0].value).toBe(25)
  })
})

describe('monthlyByCategory', () => {
  it('buckets expenses per month and accumulates totals by category', () => {
    vi.setSystemTime(new Date(2026, 5, 15)) // June 2026
    const expenses = [
      makeExpense({ date: '2026-05-01', category: 'food', amount: 10, myShare: 10 }),
      makeExpense({ date: '2026-06-01', category: 'food', amount: 20, myShare: 20 }),
      makeExpense({ date: '2026-06-10', category: 'groceries', amount: 5, myShare: 5 }),
    ]
    const buckets = monthlyByCategory(expenses, 'total', 'all')
    const may = buckets.find((b) => b.key === '2026-05')
    const june = buckets.find((b) => b.key === '2026-06')
    expect(may?.total).toBe(10)
    expect(june?.total).toBe(25)
    expect(june?.byCategory.food).toBe(20)
    expect(june?.byCategory.groceries).toBe(5)
    vi.useRealTimers()
  })

  it('produces one bucket per month even with no expenses in some months', () => {
    vi.setSystemTime(new Date(2026, 2, 1)) // March 2026
    const buckets = monthlyByCategory([], 'total', '3m')
    expect(buckets.map((b) => b.key)).toEqual(['2026-01', '2026-02', '2026-03'])
    vi.useRealTimers()
  })
})

describe('niceCeil', () => {
  it('returns 10 for non-positive input', () => {
    expect(niceCeil(0)).toBe(10)
    expect(niceCeil(-5)).toBe(10)
  })

  it('rounds up to a clean 1/2/2.5/5/10 step', () => {
    expect(niceCeil(1)).toBe(1)
    expect(niceCeil(15)).toBe(20)
    expect(niceCeil(45)).toBe(50)
    expect(niceCeil(80)).toBe(100)
  })
})
