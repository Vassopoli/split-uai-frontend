import { useEffect, useMemo, useState } from 'react'
import { Navigate, useOutletContext, useParams } from 'react-router-dom'
import { Plus, HandCoins, Download } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/Card'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ActivityList } from '../components/ActivityList'
import { AuditLogList } from '../components/AuditLogList'
import { balanceFromResponse, describeBalance, formatBRL, round2 } from '../lib/balance'
import { todayLocalISODate } from '../lib/date'
import { exportFriendActivityCsv } from '../lib/csvExport'
import * as api from '../lib/api'
import type { ActivityItem, AuditLogEntry, FriendBalance } from '../types'
import type { LayoutContext } from './layoutContext'

type Tab = 'historico' | 'atividades'

export function FriendDetail() {
  const { friendId } = useParams<{ friendId: string }>()
  const { openAddExpense } = useOutletContext<LayoutContext>()
  const [tab, setTab] = useState<Tab>('historico')
  const [auditLog, setAuditLog] = useState<AuditLogEntry[] | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)
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

  useEffect(() => {
    setAuditLog(null)
    setAuditError(null)
  }, [friendId, expenses, settlements])

  useEffect(() => {
    if (tab !== 'atividades' || !friendId || auditLog !== null || auditLoading) return
    setAuditLoading(true)
    setAuditError(null)
    api
      .fetchActivityLog(friendId)
      .then(setAuditLog)
      .catch((err) => setAuditError(err instanceof Error ? err.message : 'Erro ao buscar atividades.'))
      .finally(() => setAuditLoading(false))
  }, [tab, friendId, auditLog, auditLoading])

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
              <Download size={16} /> Exportar CSV
            </Button>
          )}
          {balance.net !== 0 && (
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleOpenSettle}
            >
              <HandCoins size={16} /> Acertar contas
            </Button>
          )}
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[#12251f] dark:text-white">
            {tab === 'historico' ? `Histórico com ${firstName}` : `Atividades com ${firstName}`}
          </h2>
          <div className="flex gap-1">
            {(
              [
                { value: 'historico' as const, label: 'Histórico' },
                { value: 'atividades' as const, label: 'Atividades' },
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
        <Card className="overflow-hidden">
          {tab === 'historico' ? (
            <ActivityList
              items={activity}
              friendsById={{ [friend.id]: friend }}
              emptyMessage={`Nenhuma despesa com ${firstName} ainda.`}
            />
          ) : auditLoading ? (
            <p className="px-5 py-10 text-center text-sm text-[#8a8593]">Carregando atividades...</p>
          ) : auditError ? (
            <p className="px-5 py-10 text-center text-sm text-owe-600">{auditError}</p>
          ) : (
            <AuditLogList
              entries={auditLog ?? []}
              friendsById={{ [friend.id]: friend }}
              emptyMessage={`Nenhuma atividade com ${firstName} ainda.`}
            />
          )}
        </Card>
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
