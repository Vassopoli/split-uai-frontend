import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Pencil, Trash2 } from 'lucide-react'
import type { Expense, ExpenseCategory, Friend } from '../types'
import { Modal } from './Modal'
import { Button } from './Button'
import { SplitEditor, type SplitResult } from './SplitEditor'
import { CATEGORY_OPTIONS, CATEGORY_LABELS, CategoryIcon } from './CategoryIcon'
import { Avatar, MeAvatar } from './Avatar'
import { formatBRL } from '../lib/balance'
import { parseLocalDate } from '../lib/date'
import type { UpdateExpenseInput } from '../lib/api'

const SPLIT_LABELS: Record<Expense['splitType'], string> = {
  equal: 'Dividido igualmente',
  exact: 'Dividido por valor',
  percentage: 'Dividido por porcentagem',
}

export function ExpenseDetailModal({
  expense,
  friend,
  onClose,
  onUpdate,
  onDelete,
}: {
  expense: Expense
  friend: Friend
  onClose: () => void
  onUpdate: (input: UpdateExpenseInput) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')

  const [description, setDescription] = useState(expense.description)
  const [notes, setNotes] = useState(expense.notes ?? '')
  const [amountStr, setAmountStr] = useState(expense.amount.toFixed(2).replace('.', ','))
  const [category, setCategory] = useState<ExpenseCategory>(expense.category)
  const [paidBy, setPaidBy] = useState<'me' | 'friend'>(expense.paidBy)
  const [date, setDate] = useState(expense.date.slice(0, 10))
  const [split, setSplit] = useState<SplitResult>({
    splitType: expense.splitType,
    myShare: expense.myShare,
    friendShare: expense.friendShare,
    valid: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amount = useMemo(() => parseFloat(amountStr.replace(',', '.')) || 0, [amountStr])
  const canSubmit = description.trim().length > 0 && amount > 0 && split.valid && !submitting

  const iOwe = expense.paidBy === 'friend'
  const myNet = iOwe ? -expense.myShare : expense.friendShare

  async function handleSave() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onUpdate({
        description: description.trim(),
        notes: notes.trim() || undefined,
        category,
        amount,
        paidBy,
        splitType: split.splitType,
        myShare: split.myShare,
        friendShare: split.friendShare,
        date,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar despesa.')
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setSubmitting(true)
    setError(null)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir despesa.')
      setSubmitting(false)
    }
  }

  if (mode === 'delete') {
    return (
      <Modal title="Excluir despesa" onClose={onClose}>
        <p className="text-sm text-[#4b4655] dark:text-gray-300">
          Tem certeza que quer excluir <strong>{expense.description}</strong>?
          Essa ação não pode ser desfeita.
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-owe-50 px-3 py-2 text-xs text-owe-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setMode('view')} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={submitting}>
            {submitting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </Modal>
    )
  }

  if (mode === 'edit') {
    return (
      <Modal title="Editar despesa" onClose={onClose} wide>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={description.includes('\n') ? 4 : 1}
              className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
              Observações <span className="font-normal text-[#8a8593]">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={notes.includes('\n') ? 4 : 1}
              className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
                Valor total
              </label>
              <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 dark:border-white/15 dark:bg-white/5">
                <span className="text-sm text-[#8a8593]">R$</span>
                <input
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#12251f] outline-none dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
              Categoria
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    category === c
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

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
              Pago por
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaidBy('me')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  paidBy === 'me'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
                }`}
              >
                <MeAvatar size="sm" /> Você
              </button>
              <button
                type="button"
                onClick={() => setPaidBy('friend')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  paidBy === 'friend'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
                }`}
              >
                <Avatar
                  name={friend.name}
                  initials={friend.initials}
                  color={friend.color}
                  picture={friend.picture}
                  size="sm"
                />
                {friend.name.split(' ')[0]}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
              Como dividir
            </label>
            <SplitEditor
              amount={amount}
              friend={friend}
              onChange={setSplit}
              initial={{
                splitType: expense.splitType,
                myShare: expense.myShare,
                friendShare: expense.friendShare,
              }}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-owe-50 px-3 py-2 text-xs text-owe-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setMode('view')}
              type="button"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSubmit} type="button">
              {submitting ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Despesa" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[#4b4655] dark:bg-white/10 dark:text-gray-300">
            <CategoryIcon category={expense.category} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[#12251f] dark:text-white">
              {expense.description}
            </p>
            <p className="text-xs text-[#8a8593]">
              {CATEGORY_LABELS[expense.category]} ·{' '}
              {format(parseLocalDate(expense.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            {expense.notes && (
              <p className="mt-1 whitespace-pre-line text-xs text-[#8a8593]">{expense.notes}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-black/[0.06] p-4 text-sm dark:border-white/10">
          <div className="flex justify-between">
            <span className="text-[#8a8593]">Valor total</span>
            <span className="font-medium text-[#12251f] dark:text-white">
              {formatBRL(expense.amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8a8593]">Pago por</span>
            <span className="font-medium text-[#12251f] dark:text-white">
              {expense.paidBy === 'me' ? 'Você' : friend.name.split(' ')[0]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8a8593]">{SPLIT_LABELS[expense.splitType]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8a8593]">Sua parte</span>
            <span className="font-medium text-[#12251f] dark:text-white">
              {formatBRL(expense.myShare)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8a8593]">Parte de {friend.name.split(' ')[0]}</span>
            <span className="font-medium text-[#12251f] dark:text-white">
              {formatBRL(expense.friendShare)}
            </span>
          </div>
        </div>

        <div
          className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${
            expense.settled
              ? 'bg-black/[0.03] text-[#8a8593] dark:bg-white/[0.04]'
              : myNet >= 0
                ? 'bg-owed-50 text-owed-600'
                : 'bg-owe-50 text-owe-600'
          }`}
        >
          {expense.settled
            ? 'Essa despesa já foi quitada'
            : myNet >= 0
              ? `Você recebe ${formatBRL(myNet)}`
              : `Você deve ${formatBRL(myNet)}`}
        </div>

        {error && (
          <p className="rounded-lg bg-owe-50 px-3 py-2 text-xs text-owe-600">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} type="button">
            Fechar
          </Button>
          {!expense.settled && (
            <>
              <Button variant="danger" onClick={() => setMode('delete')} type="button">
                <Trash2 size={16} /> Excluir
              </Button>
              <Button onClick={() => setMode('edit')} type="button">
                <Pencil size={16} /> Editar
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
