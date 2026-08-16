import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CATEGORY_OPTIONS, CATEGORY_LABELS } from '../CategoryIcon'
import { CATEGORY_BG_CLASS } from '../../lib/categoryColors'
import { formatBRL } from '../../lib/balance'
import { niceCeil, type MonthBucket } from '../../lib/stats'
import type { ExpenseCategory } from '../../types'

const CHART_HEIGHT = 168
const BAR_WIDTH = 24

function compactBRL(value: number): string {
  if (value <= 0) return 'R$ 0'
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}mil`
  return `R$ ${Math.round(value)}`
}

interface Segment {
  category: ExpenseCategory
  value: number
  px: number
}

function segmentsFor(bucket: MonthBucket, totalPx: number): Segment[] {
  return CATEGORY_OPTIONS.filter((c) => (bucket.byCategory[c] ?? 0) > 0).map((category) => {
    const value = bucket.byCategory[category] ?? 0
    const px = bucket.total > 0 ? (value / bucket.total) * totalPx : 0
    return { category, value, px: Math.max(px, 1) }
  })
}

/** Stacked column per month — categorical color is the only way to tell segments apart, so a legend is mandatory here (unlike CategoryBarChart, where rows carry their own text label). */
export function MonthlyStackedChart({ buckets }: { buckets: MonthBucket[] }) {
  const axisMax = niceCeil(Math.max(...buckets.map((b) => b.total), 0))
  const categoriesPresent = CATEGORY_OPTIONS.filter((c) =>
    buckets.some((b) => (b.byCategory[c] ?? 0) > 0),
  )

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative w-10 shrink-0" style={{ height: CHART_HEIGHT }}>
          {[1, 0.5, 0].map((f) => (
            <span
              key={f}
              className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-[#8a8593]"
              style={{ bottom: `${f * CHART_HEIGHT}px` }}
            >
              {compactBRL(axisMax * f)}
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: CHART_HEIGHT }}>
          {[1, 0.5, 0].map((f) => (
            <div
              key={f}
              className={`absolute inset-x-0 border-t ${
                f === 0
                  ? 'border-black/10 dark:border-white/15'
                  : 'border-black/[0.06] dark:border-white/10'
              }`}
              style={{ bottom: `${f * CHART_HEIGHT}px` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-2">
            {buckets.map((b) => {
              const totalPx = axisMax > 0 ? (b.total / axisMax) * CHART_HEIGHT : 0
              const segments = segmentsFor(b, totalPx)
              return (
                <div
                  key={b.key}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  {b.total > 0 && (
                    <span className="text-[10px] font-medium tabular-nums text-[#12251f] dark:text-white">
                      {compactBRL(b.total)}
                    </span>
                  )}
                  <div
                    className="flex flex-col-reverse overflow-hidden rounded-t-[4px]"
                    style={{ width: BAR_WIDTH, height: totalPx }}
                  >
                    {segments.map((seg, i) => (
                      <div
                        key={seg.category}
                        title={`${CATEGORY_LABELS[seg.category]} — ${formatBRL(seg.value)} (${format(b.date, 'MMM/yy', { locale: ptBR })})`}
                        className={`transition-[filter] duration-150 hover:brightness-110 ${CATEGORY_BG_CLASS[seg.category]} ${
                          i < segments.length - 1 ? 'mb-[2px]' : ''
                        }`}
                        style={{ height: seg.px }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex gap-2 pl-10">
        {buckets.map((b) => (
          <div
            key={b.key}
            className="min-w-0 flex-1 truncate text-center text-[11px] capitalize text-[#8a8593]"
          >
            {format(b.date, 'MMM/yy', { locale: ptBR })}
          </div>
        ))}
      </div>

      {categoriesPresent.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-black/[0.06] pt-3 dark:border-white/10">
          {categoriesPresent.map((c) => (
            <div
              key={c}
              className="flex items-center gap-1.5 text-xs text-[#4b4655] dark:text-gray-300"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_BG_CLASS[c]}`} />
              {CATEGORY_LABELS[c]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
