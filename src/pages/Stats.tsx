import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart3, Table2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/Card'
import { CategoryIcon, CATEGORY_LABELS } from '../components/CategoryIcon'
import { CategoryBarChart } from '../components/charts/CategoryBarChart'
import { MonthlyStackedChart } from '../components/charts/MonthlyStackedChart'
import { formatBRL, round2 } from '../lib/balance'
import {
  categoryTotals,
  filterExpenses,
  monthlyByCategory,
  DATE_RANGE_OPTIONS,
  type DateRangePreset,
  type ValueBasis,
} from '../lib/stats'

const BASIS_OPTIONS: { value: ValueBasis; label: string }[] = [
  { value: 'total', label: 'Valor total' },
  { value: 'mine', label: 'Minha parte' },
]

export function Stats() {
  const friends = useAppStore((s) => s.friends)
  const expenses = useAppStore((s) => s.expenses)

  const [range, setRange] = useState<DateRangePreset>('6m')
  const [friendId, setFriendId] = useState<'all' | string>('all')
  const [basis, setBasis] = useState<ValueBasis>('total')
  const [showTable, setShowTable] = useState(false)

  const filtered = useMemo(
    () => filterExpenses(expenses, { range, friendId }),
    [expenses, range, friendId],
  )
  const totals = useMemo(() => categoryTotals(filtered, basis), [filtered, basis])
  const buckets = useMemo(
    () => monthlyByCategory(filtered, basis, range),
    [filtered, basis, range],
  )
  const grandTotal = round2(totals.reduce((s, t) => s + t.value, 0))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Pills
          options={DATE_RANGE_OPTIONS}
          value={range}
          onChange={setRange}
        />
        <span className="mx-1 hidden h-5 w-px bg-black/10 dark:bg-white/10 sm:block" />
        <Pills
          options={[{ value: 'all', label: 'Todo mundo' }, ...friends.map((f) => ({ value: f.id, label: f.name.split(' ')[0] }))]}
          value={friendId}
          onChange={setFriendId}
        />
        <span className="mx-1 hidden h-5 w-px bg-black/10 dark:bg-white/10 sm:block" />
        <Pills options={BASIS_OPTIONS} value={basis} onChange={setBasis} />
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <BarChart3 size={20} />
          </div>
          <p className="text-sm font-semibold text-[#12251f] dark:text-white">
            Nenhuma despesa nesse período
          </p>
          <p className="text-sm text-[#8a8593]">Tente outro filtro de data ou de amigo.</p>
        </Card>
      ) : (
        <>
          <Card className="flex items-center justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#8a8593]">
                Total no período
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#12251f] dark:text-white">
                {formatBRL(grandTotal)}
              </p>
            </div>
            <p className="text-sm text-[#8a8593]">
              {filtered.length} {filtered.length === 1 ? 'despesa' : 'despesas'}
            </p>
          </Card>

          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold text-[#12251f] dark:text-white">
              Por categoria
            </h2>
            <Card className="p-5">
              <CategoryBarChart totals={totals} />
            </Card>
          </div>

          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold text-[#12251f] dark:text-white">
              Por mês
            </h2>
            <Card className="p-5">
              <MonthlyStackedChart buckets={buckets} />
            </Card>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="flex items-center gap-1.5 px-1 text-xs text-[#6b6375] hover:underline dark:text-gray-400"
            >
              <Table2 size={13} />
              {showTable ? 'Esconder tabela' : 'Ver tabela'}
            </button>
            {showTable && (
              <Card className="mt-2 overflow-x-auto p-5">
                <table className="w-full min-w-[480px] text-xs">
                  <thead>
                    <tr className="border-b border-black/[0.06] dark:border-white/10">
                      <th className="py-1.5 pr-2 text-left font-medium text-[#8a8593]">
                        Categoria
                      </th>
                      {buckets.map((b) => (
                        <th
                          key={b.key}
                          className="whitespace-nowrap px-2 py-1.5 text-right font-medium capitalize text-[#8a8593]"
                        >
                          {format(b.date, 'MMM/yy', { locale: ptBR })}
                        </th>
                      ))}
                      <th className="whitespace-nowrap py-1.5 pl-2 text-right font-medium text-[#8a8593]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {totals.map((t) => (
                      <tr key={t.category} className="border-b border-black/[0.04] dark:border-white/[0.06]">
                        <td className="flex items-center gap-1.5 py-1.5 pr-2 text-[#4b4655] dark:text-gray-300">
                          <CategoryIcon category={t.category} className="h-3.5 w-3.5 shrink-0" />
                          {CATEGORY_LABELS[t.category]}
                        </td>
                        {buckets.map((b) => (
                          <td
                            key={b.key}
                            className="px-2 py-1.5 text-right tabular-nums text-[#12251f] dark:text-white"
                          >
                            {formatBRL(b.byCategory[t.category] ?? 0)}
                          </td>
                        ))}
                        <td className="py-1.5 pl-2 text-right font-medium tabular-nums text-[#12251f] dark:text-white">
                          {formatBRL(t.value)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-medium text-[#12251f] dark:text-white">
                      <td className="py-1.5 pr-2">Total</td>
                      {buckets.map((b) => (
                        <td key={b.key} className="px-2 py-1.5 text-right tabular-nums">
                          {formatBRL(b.total)}
                        </td>
                      ))}
                      <td className="py-1.5 pl-2 text-right tabular-nums">
                        {formatBRL(grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
              : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
