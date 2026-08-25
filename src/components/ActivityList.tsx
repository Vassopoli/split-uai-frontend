import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ActivityItem, Expense, Friend } from '../types'
import { ExpenseRow } from './ExpenseRow'
import { SettlementRow } from './SettlementRow'
import { ExpenseDetailModal } from './ExpenseDetailModal'
import { useAppStore } from '../store/useAppStore'
import { parseLocalDate } from '../lib/date'

export function itemDate(item: ActivityItem): number {
  return parseLocalDate(item.data.date).getTime()
}

function monthLabel(timestamp: number): string {
  const label = format(new Date(timestamp), 'MMMM yyyy', { locale: ptBR })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function monthKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${d.getMonth()}`
}

/**
 * Expenses split cleanly on their own `settled` flag, unconditionally.
 * Settlements don't have that flag — they're always a "closed" event — so a
 * settlement only belongs in the visible list when it's recent: no older
 * than the earliest currently-open expense. That keeps a just-happened
 * payment visible (it lands among today's open expenses) while an old
 * settle-up from years ago that closed out long-gone expenses stays
 * collapsed under "mostrar mais" like the history it settled.
 */
function isOpenItem(item: ActivityItem, recentSettlementCutoff: number | null): boolean {
  if (item.kind === 'expense') return !item.data.settled
  return recentSettlementCutoff !== null && itemDate(item) >= recentSettlementCutoff
}

export function ActivityList({
  items,
  friendsById,
  emptyMessage = 'Nenhuma atividade ainda.',
  recentSettlementCutoff: cutoffOverride,
}: {
  items: ActivityItem[]
  friendsById: Record<string, Friend>
  emptyMessage?: string
  /**
   * Cutoff to classify settlements as open/closed (see isOpenItem below).
   * Pass this in whenever `items` is a filtered subset of the friend's full
   * activity — computing it from the filtered list would make a settlement's
   * open/closed status depend on which filters happen to be active. Falls
   * back to computing it from `items` when omitted (unfiltered callers).
   */
  recentSettlementCutoff?: number | null
}) {
  const [showSettled, setShowSettled] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const updateExpense = useAppStore((s) => s.updateExpense)
  const deleteExpense = useAppStore((s) => s.deleteExpense)

  const openExpenseDates = items
    .filter((i): i is Extract<ActivityItem, { kind: 'expense' }> => i.kind === 'expense' && !i.data.settled)
    .map(itemDate)
  const recentSettlementCutoff =
    cutoffOverride !== undefined
      ? cutoffOverride
      : openExpenseDates.length > 0
        ? Math.min(...openExpenseDates)
        : null

  const sorted = [...items].sort((a, b) => {
    const dateDiff = itemDate(b) - itemDate(a)
    if (dateDiff !== 0) return dateDiff
    const aCreated = a.kind === 'expense' ? new Date(a.data.createdAt).getTime() : 0
    const bCreated = b.kind === 'expense' ? new Date(b.data.createdAt).getTime() : 0
    return bCreated - aCreated
  })
  const open = sorted.filter((i) => isOpenItem(i, recentSettlementCutoff))
  const settled = sorted.filter((i) => !isOpenItem(i, recentSettlementCutoff))

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-[#8a8593]">
        <Inbox className="h-6 w-6" strokeWidth={1.5} />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  const renderItem = (item: ActivityItem) => {
    const friend = friendsById[item.data.friendId]
    if (!friend) return null
    return item.kind === 'expense' ? (
      <ExpenseRow
        key={item.data.id}
        expense={item.data}
        friend={friend}
        onClick={() => setSelectedExpense(item.data)}
      />
    ) : (
      <SettlementRow key={item.data.id} settlement={item.data} friend={friend} />
    )
  }

  const renderGrouped = (list: ActivityItem[]) => {
    let lastKey: string | null = null
    const nodes: ReactNode[] = []
    for (const item of list) {
      const ts = itemDate(item)
      const key = monthKey(ts)
      if (key !== lastKey) {
        lastKey = key
        nodes.push(
          <div
            key={`month-${key}`}
            className="bg-black/[0.02] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8593] dark:bg-white/[0.03] sm:px-5"
          >
            {monthLabel(ts)}
          </div>,
        )
      }
      nodes.push(renderItem(item))
    }
    return nodes
  }

  return (
    <div>
      {open.length > 0 ? (
        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          {renderGrouped(open)}
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-[#8a8593]">
          Nenhuma pendência em aberto.
        </div>
      )}

      {settled.length > 0 && (
        <div className="border-t border-black/[0.06] dark:border-white/10">
          <button
            onClick={() => setShowSettled((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 px-5 py-3 text-sm font-medium text-brand-600 hover:bg-black/[0.02] dark:text-brand-300 dark:hover:bg-white/[0.03]"
          >
            {showSettled ? (
              <>
                Ocultar quitados <ChevronUp size={16} />
              </>
            ) : (
              <>
                Mostrar mais ({settled.length} quitado{settled.length > 1 ? 's' : ''})
                <ChevronDown size={16} />
              </>
            )}
          </button>
          {showSettled && (
            <div className="divide-y divide-black/[0.05] border-t border-black/[0.06] dark:divide-white/[0.06] dark:border-white/10">
              {renderGrouped(settled)}
            </div>
          )}
        </div>
      )}

      {selectedExpense &&
        (() => {
          const friend = friendsById[selectedExpense.friendId]
          if (!friend) return null
          return (
            <ExpenseDetailModal
              expense={selectedExpense}
              friend={friend}
              onClose={() => setSelectedExpense(null)}
              onUpdate={(input) => updateExpense(selectedExpense.id, input)}
              onDelete={() => deleteExpense(selectedExpense.id)}
            />
          )
        })()}
    </div>
  )
}
