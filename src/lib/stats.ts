import type { Expense, ExpenseCategory } from '../types'
import { CATEGORY_OPTIONS } from '../components/CategoryIcon'
import { parseLocalDate, todayLocalISODate } from './date'
import { round2 } from './balance'

export type DateRangePreset = 'this_month' | '3m' | '6m' | 'ytd' | 'all'

export const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'this_month', label: 'Este mês' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: 'ytd', label: 'Este ano' },
  { value: 'all', label: 'Tudo' },
]

export type ValueBasis = 'total' | 'mine'

/** Start-of-range as a "YYYY-MM-DD" local date string, or null for 'all'. */
function rangeStart(preset: DateRangePreset, today: Date): string | null {
  const y = today.getFullYear()
  const m = today.getMonth()
  if (preset === 'all') return null
  if (preset === 'ytd') return `${y}-01-01`
  if (preset === 'this_month') return isoFromParts(y, m, 1)
  const monthsBack = preset === '3m' ? 2 : 5
  const start = new Date(y, m - monthsBack, 1)
  return isoFromParts(start.getFullYear(), start.getMonth(), 1)
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function filterExpenses(
  expenses: Expense[],
  { range, friendId }: { range: DateRangePreset; friendId: string | 'all' },
): Expense[] {
  const start = rangeStart(range, parseLocalDate(todayLocalISODate()))
  return expenses.filter((e) => {
    if (friendId !== 'all' && e.friendId !== friendId) return false
    if (start && e.date < start) return false
    return true
  })
}

export function basisValue(expense: Expense, basis: ValueBasis): number {
  return basis === 'mine' ? expense.myShare : expense.amount
}

export interface CategoryTotal {
  category: ExpenseCategory
  value: number
  count: number
  share: number // 0..1 of the grand total
}

export function categoryTotals(expenses: Expense[], basis: ValueBasis): CategoryTotal[] {
  const sums = new Map<ExpenseCategory, { value: number; count: number }>()
  for (const e of expenses) {
    const entry = sums.get(e.category) ?? { value: 0, count: 0 }
    entry.value += basisValue(e, basis)
    entry.count += 1
    sums.set(e.category, entry)
  }
  const grandTotal = [...sums.values()].reduce((s, v) => s + v.value, 0)
  return CATEGORY_OPTIONS.filter((c) => sums.has(c))
    .map((category) => {
      const { value, count } = sums.get(category)!
      return {
        category,
        value: round2(value),
        count,
        share: grandTotal > 0 ? value / grandTotal : 0,
      }
    })
    .sort((a, b) => b.value - a.value)
}

export interface MonthBucket {
  key: string // "YYYY-MM"
  date: Date // first day of month, for formatting
  total: number
  byCategory: Partial<Record<ExpenseCategory, number>>
}

function monthKey(dateOnly: string): string {
  return dateOnly.slice(0, 7)
}

/** One bucket per calendar month from the earliest expense (or range start) through the current month. */
export function monthlyByCategory(
  expenses: Expense[],
  basis: ValueBasis,
  range: DateRangePreset,
): MonthBucket[] {
  const today = parseLocalDate(todayLocalISODate())
  const start = rangeStart(range, today)
  const earliestExpenseKey = expenses.reduce<string | null>(
    (min, e) => (min === null || e.date < min ? e.date : min),
    null,
  )
  const firstKey = monthKey(start ?? earliestExpenseKey ?? todayLocalISODate())
  const lastKey = monthKey(todayLocalISODate())

  const buckets = new Map<string, MonthBucket>()
  let cursor = new Date(
    Number(firstKey.slice(0, 4)),
    Number(firstKey.slice(5, 7)) - 1,
    1,
  )
  const last = new Date(Number(lastKey.slice(0, 4)), Number(lastKey.slice(5, 7)) - 1, 1)
  while (cursor <= last) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, { key, date: new Date(cursor), total: 0, byCategory: {} })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  for (const e of expenses) {
    const key = monthKey(e.date)
    const bucket = buckets.get(key)
    if (!bucket) continue // outside the generated range (shouldn't happen given firstKey above)
    const value = basisValue(e, basis)
    bucket.total = round2(bucket.total + value)
    bucket.byCategory[e.category] = round2((bucket.byCategory[e.category] ?? 0) + value)
  }

  return [...buckets.values()]
}

/** Rounds up to a "clean" axis max (1/2/5 × 10^n) so gridlines land on tidy numbers. */
export function niceCeil(value: number): number {
  if (value <= 0) return 10
  const exp = Math.floor(Math.log10(value))
  const base = Math.pow(10, exp)
  const steps = [1, 2, 2.5, 5, 10]
  for (const step of steps) {
    if (value <= step * base) return step * base
  }
  return 10 * base
}
