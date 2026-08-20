import { useMemo, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, HandCoins, Download, Search, SlidersHorizontal, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/Card'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ActivityList, itemDate } from '../components/ActivityList'
import { FriendCharts } from '../components/FriendCharts'
import { CATEGORY_OPTIONS, CATEGORY_LABELS, CategoryIcon } from '../components/CategoryIcon'
import { balanceFromResponse, describeBalance, formatBRL, round2 } from '../lib/balance'
import { todayLocalISODate } from '../lib/date'
import { exportFriendActivityCsv } from '../lib/csvExport'
import { normalizeForSearch } from '../lib/text'
import * as api from '../lib/api'
import type { ActivityItem, ExpenseCategory, FriendBalance } from '../types'
import type { LayoutContext } from './layoutContext'

type Tab = 'historico' | 'graficos'

export function FriendDetail() {
  const { friendId } = useParams<{ friendId: string }>()
  const { openAddExpense } = useOutletContext<LayoutContext>()
  const [tab, setTab] = useState<Tab>('historico')
  const [historySearch, setHistorySearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<ExpenseCategory | 'settlements' | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMinStr, setAmountMinStr] = useState('')
  const [amountMaxStr, setAmountMaxStr] = useState('')
  const [confirmingSettle, setConfirmingSettle] = useState(false)
  const [settlePreview, setSettlePreview] = useState<FriendBalance | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [amountStr, setAmountStr] = useState('')
  const [noteStr, setNoteStr] = useState('')
  const [settling, setSettling] = useState(false)
  const [settleError, setSettleError] = useState<string | null>(null)

  const friends = useAppStore((s) => s.friends)
  const expenses = useAppStore((s) => s.expenses)
  const settlements = useAppStore((s) => s.settlements)
  const balances = useAppStore((s) => s.balances)
  const settleUp = useAppStore((s) => s.settleUp)
  const registerPayment = useAppStore((s) => s.registerPayment)

  const friend = friends.find((f) => f.id === friendId)

  const friendExpenses = useMemo(
    () => expenses.filter((e) => e.friendId === friendId),
    [expenses, friendId],
  )
  const friendSettlements = useMemo(
    () => settlements.filter((s) => s.friendId === friendId),
    [settlements, friendId],
  )
  const balance: FriendBalance = (friendId && balances[friendId]) || {
    friendId: friendId ?? '',
    net: 0,
  }

  const activity: ActivityItem[] = useMemo(
    () => [
      ...friendExpenses.map((e) => ({ kind: 'expense' as const, data: e })),
      ...friendSettlements.map((s) => ({ kind: 'settlement' as const, data: s })),
    ],
    [friendExpenses, friendSettlements],
  )

  const openExpenseDates = activity
    .filter((i): i is Extract<ActivityItem, { kind: 'expense' }> => i.kind === 'expense' && !i.data.settled)
    .map(itemDate)
  const recentSettlementCutoff = openExpenseDates.length > 0 ? Math.min(...openExpenseDates) : null

  const activeFilterCount =
    (typeFilter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (amountMinStr ? 1 : 0) + (amountMaxStr ? 1 : 0)
  const hasAnyFilter = activeFilterCount > 0 || historySearch.trim() !== ''

  function clearFilters() {
    setTypeFilter(null)
    setDateFrom('')
    setDateTo('')
    setAmountMinStr('')
    setAmountMaxStr('')
  }

  const filteredActivity = useMemo(() => {
    const q = normalizeForSearch(historySearch.trim())
    const min = amountMinStr.trim() ? parseFloat(amountMinStr.replace(',', '.')) : null
    const max = amountMaxStr.trim() ? parseFloat(amountMaxStr.replace(',', '.')) : null

    return activity.filter((item) => {
      if (dateFrom && item.data.date < dateFrom) return false
      if (dateTo && item.data.date > dateTo) return false
      if (min !== null && !Number.isNaN(min) && item.data.amount < min) return false
      if (max !== null && !Number.isNaN(max) && item.data.amount > max) return false
      if (typeFilter === 'settlements') return item.kind === 'settlement'
      if (q || typeFilter) {
        if (item.kind !== 'expense') return false
        if (q && !normalizeForSearch(item.data.description).includes(q)) return false
        if (typeFilter && item.data.category !== typeFilter) return false
      }
      return true
    })
  }, [activity, historySearch, typeFilter, dateFrom, dateTo, amountMinStr, amountMaxStr])

  if (!friends.length) return null
  if (!friend || !friendId) return <Navigate to="/" replace />

  const firstName = friend.name.split(' ')[0]
  const { text, tone } = describeBalance(balance.net, firstName)

  async function handleOpenSettle() {
    if (!friendId) return
    setSettleError(null)
    setSettlePreview(null)
    setAmountStr('')
    setNoteStr('')
    setConfirmingSettle(true)
    setPreviewLoading(true)
    try {
      const response = await api.fetchFriendBalance(friendId)
      const preview = balanceFromResponse(response)
      setSettlePreview(preview)
      setAmountStr(Math.abs(preview.net).toFixed(2).replace('.', ','))
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : 'Erro ao buscar saldo atual.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const owed = settlePreview ? Math.abs(settlePreview.net) : 0
  const amount = round2(parseFloat(amountStr.replace(',', '.')) || 0)
  const isFullAmount = settlePreview !== null && Math.abs(amount - owed) < 0.005
  const amountValid = settlePreview !== null && amount > 0 && amount <= owed + 0.005

  async function handleConfirm() {
    if (!friendId || !settlePreview || !amountValid) return
    setSettling(true)
    setSettleError(null)
    try {
      if (isFullAmount) {
        await settleUp(friendId)
      } else {
        await registerPayment(friendId, {
          amount,
          date: todayLocalISODate(),
          note: noteStr.trim() || 'Pagamento parcial',
        })
      }
      setConfirmingSettle(false)
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : 'Erro ao registrar pagamento.')
    } finally {
      setSettling(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b6375] hover:text-[#12251f] dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft size={16} /> Voltar
      </Link>

      <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            name={friend.name}
            initials={friend.initials}
            color={friend.color}
            picture={friend.picture}
            size="lg"
          />
          <div>
            <p className="text-base font-semibold text-[#12251f] dark:text-white">
              {friend.name}
            </p>
            <p
              className={`text-sm ${
                tone === 'owed'
                  ? 'text-owed-600'
                  : tone === 'owe'
                    ? 'text-owe-600'
                    : 'text-[#8a8593]'
              }`}
            >
              {text}
            </p>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => openAddExpense(friendId)}
          >
            <Plus size={16} /> Despesa
          </Button>
          {activity.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => exportFriendActivityCsv(friendExpenses, friendSettlements, friend)}
            >
              <Download size={16} />
              <span className="sm:hidden">CSV</span>
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
          )}
          {balance.net !== 0 && (
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleOpenSettle}
            >
              <HandCoins size={16} />
              <span className="sm:hidden">Acertar</span>
              <span className="hidden sm:inline">Acertar contas</span>
            </Button>
          )}
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[#12251f] dark:text-white">
            {tab === 'historico' ? `Histórico com ${firstName}` : `Gráficos de ${firstName}`}
          </h2>
          <div className="flex gap-1">
            {(
              [
                { value: 'historico' as const, label: 'Histórico' },
                { value: 'graficos' as const, label: 'Gráficos' },
              ]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTab(opt.value)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  tab === opt.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {tab === 'historico' && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/15 dark:bg-white/5">
                <Search size={15} className="shrink-0 text-[#8a8593]" />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar despesa por nome..."
                  className="w-full bg-transparent text-sm text-[#12251f] outline-none placeholder:text-[#8a8593] dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  filtersOpen || activeFilterCount > 0
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'border-black/10 bg-white text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:text-gray-300'
                }`}
              >
                <SlidersHorizontal size={15} />
                <span className="hidden sm:inline">Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {filtersOpen && (
              <div className="space-y-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/15 dark:bg-white/5">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-[#6b6375] dark:text-gray-400">Categoria</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTypeFilter(null)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        typeFilter === null
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                          : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter((prev) => (prev === 'settlements' ? null : 'settlements'))}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        typeFilter === 'settlements'
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                          : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
                      }`}
                    >
                      <HandCoins className="h-3.5 w-3.5" />
                      Pagamentos
                    </button>
                    {CATEGORY_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTypeFilter((prev) => (prev === c ? null : c))}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          typeFilter === c
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                            : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
                        }`}
                      >
                        <CategoryIcon category={c} className="h-3.5 w-3.5" />
                        {CATEGORY_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-[#6b6375] dark:text-gray-400">De</p>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-[#6b6375] dark:text-gray-400">Até</p>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-[#6b6375] dark:text-gray-400">Valor mínimo</p>
                    <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 dark:border-white/15 dark:bg-white/5">
                      <span className="text-xs text-[#8a8593]">R$</span>
                      <input
                        inputMode="decimal"
                        value={amountMinStr}
                        onChange={(e) => setAmountMinStr(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-transparent text-sm text-[#12251f] outline-none placeholder:text-[#8a8593] dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-[#6b6375] dark:text-gray-400">Valor máximo</p>
                    <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 dark:border-white/15 dark:bg-white/5">
                      <span className="text-xs text-[#8a8593]">R$</span>
                      <input
                        inputMode="decimal"
                        value={amountMaxStr}
                        onChange={(e) => setAmountMaxStr(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-transparent text-sm text-[#12251f] outline-none placeholder:text-[#8a8593] dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
                  >
                    <X size={12} /> Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {tab === 'graficos' ? (
          <FriendCharts friendId={friendId} expenses={friendExpenses} />
        ) : (
          <Card className="overflow-hidden">
            <ActivityList
              items={filteredActivity}
              friendsById={{ [friend.id]: friend }}
              recentSettlementCutoff={recentSettlementCutoff}
              emptyMessage={
                hasAnyFilter
                  ? historySearch
                    ? `Nenhuma despesa encontrada para "${historySearch}".`
                    : 'Nenhuma despesa encontrada para os filtros selecionados.'
                  : `Nenhuma despesa com ${firstName} ainda.`
              }
            />
          </Card>
        )}
      </div>

      {confirmingSettle && (
        <Modal title="Acertar contas" onClose={() => setConfirmingSettle(false)}>
          {previewLoading ? (
            <p className="text-sm text-[#8a8593]">Buscando saldo atual...</p>
          ) : settlePreview && settlePreview.net === 0 ? (
            <p className="text-sm text-[#4b4655] dark:text-gray-300">
              Vocês já estão quitados com {firstName}.
            </p>
          ) : settlePreview ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
                  Valor do pagamento
                </label>
                <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 dark:border-white/15 dark:bg-white/5">
                  <span className="text-sm text-[#8a8593]">R$</span>
                  <input
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#12251f] outline-none dark:text-white"
                  />
                  {!isFullAmount && (
                    <button
                      type="button"
                      onClick={() => setAmountStr(owed.toFixed(2).replace('.', ','))}
                      className="shrink-0 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
                    >
                      Usar valor total
                    </button>
                  )}
                </div>
                {!amountValid && amountStr !== '' && (
                  <p className="mt-1 text-xs text-owe-600">
                    O valor deve ser maior que zero e no máximo {formatBRL(owed)}.
                  </p>
                )}
              </div>

              {!isFullAmount && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
                    Nota (opcional)
                  </label>
                  <input
                    value={noteStr}
                    onChange={(e) => setNoteStr(e.target.value)}
                    placeholder="Pagamento parcial"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </div>
              )}

              {amountValid && (
                <p className="text-sm text-[#4b4655] dark:text-gray-300">
                  {settlePreview.net > 0
                    ? `${firstName} vai marcar que pagou ${formatBRL(amount)} a você.`
                    : `Você vai marcar que pagou ${formatBRL(amount)} a ${firstName}.`}{' '}
                  {isFullAmount
                    ? `Todas as despesas em aberto${settlePreview.net > 0 ? ` com ${firstName}` : ''} serão quitadas.`
                    : `As despesas em aberto continuam abertas — o saldo cai para ${formatBRL(round2(owed - amount))}.`}
                </p>
              )}
            </div>
          ) : null}

          {settleError && (
            <p className="mt-3 rounded-lg bg-owe-50 px-3 py-2 text-xs text-owe-600">
              {settleError}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmingSettle(false)}
              disabled={settling}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={settling || previewLoading || !amountValid}
            >
              {settling
                ? 'Registrando...'
                : isFullAmount
                  ? 'Quitar tudo'
                  : 'Registrar pagamento'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
