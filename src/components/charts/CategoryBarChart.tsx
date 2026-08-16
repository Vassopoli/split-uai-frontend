import { CategoryIcon, CATEGORY_LABELS } from '../CategoryIcon'
import { CATEGORY_BG_CLASS } from '../../lib/categoryColors'
import { formatBRL } from '../../lib/balance'
import type { CategoryTotal } from '../../lib/stats'

/**
 * Horizontal bar per category, sorted by value. Each row already carries its
 * own text label, so color here reinforces identity for cross-reference with
 * MonthlyStackedChart rather than being the only way to tell rows apart —
 * no separate legend needed.
 */
export function CategoryBarChart({ totals }: { totals: CategoryTotal[] }) {
  const maxValue = Math.max(...totals.map((t) => t.value), 0.01)

  return (
    <div className="space-y-2.5">
      {totals.map((t) => {
        const widthPct = Math.max((t.value / maxValue) * 100, 2)
        return (
          <div key={t.category} className="group flex items-center gap-3">
            <div className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-[#4b4655] dark:text-gray-300">
              <CategoryIcon category={t.category} className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{CATEGORY_LABELS[t.category]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div
                title={`${CATEGORY_LABELS[t.category]}: ${formatBRL(t.value)}`}
                className={`h-3.5 rounded-r-[4px] transition-[filter] duration-150 group-hover:brightness-110 ${CATEGORY_BG_CLASS[t.category]}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <div className="w-24 shrink-0 text-right text-xs">
              <span className="font-medium text-[#12251f] dark:text-white">
                {formatBRL(t.value)}
              </span>
              <span className="ml-1 text-[#8a8593]">{Math.round(t.share * 100)}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
