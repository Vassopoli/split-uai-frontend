import type { ExpenseCategory } from '../types'
import type { ScanReceiptResult } from './api'

export interface ExpenseDraft {
  description: string
  notes?: string
  amount: number
  category: ExpenseCategory
  date?: string
  lowConfidence: boolean
  /** Set once the user itemizes the receipt (ItemizeExpenseModal) — otherwise defaults to an equal split. */
  split?: { splitType: 'exact'; myShare: number; friendShare: number }
}

/** `description`/`notes` come pre-written by the AI in the scan response — no client-side formatting needed. */
export function buildExpenseDraft(result: ScanReceiptResult): ExpenseDraft {
  return {
    description: result.description,
    notes: result.notes.trim() || undefined,
    amount: result.total,
    category: result.category,
    date: result.purchasedAt ? result.purchasedAt.slice(0, 10) : undefined,
    lowConfidence: result.confidence === 'low',
  }
}
