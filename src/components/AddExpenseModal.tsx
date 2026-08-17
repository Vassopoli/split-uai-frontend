import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, TriangleAlert, UserPlus } from 'lucide-react'
import type { ExpenseCategory, Friend } from '../types'
import { Modal } from './Modal'
import { Button } from './Button'
import { SplitEditor, type SplitResult } from './SplitEditor'
import { CATEGORY_OPTIONS, CATEGORY_LABELS, CategoryIcon } from './CategoryIcon'
import { Avatar, MeAvatar } from './Avatar'
import type { CategorizeConfidence, CreateExpenseInput } from '../lib/api'
import type { ExpenseDraft } from '../lib/receiptDraft'
import { todayLocalISODate } from '../lib/date'
import { useAutoCategorize } from '../hooks/useAutoCategorize'

export function AddExpenseModal({
  friends,
  defaultFriendId,
  draft,
  onClose,
  onSubmit,
}: {
  friends: Friend[]
  defaultFriendId?: string
  /** Prefill from a scanned receipt — still just a starting point, the user can edit everything. */
  draft?: ExpenseDraft
  onClose: () => void
  onSubmit: (input: CreateExpenseInput) => Promise<void>
}) {
  const [friendId, setFriendId] = useState(defaultFriendId ?? friends[0]?.id ?? '')
  const [description, setDescription] = useState(draft?.description ?? '')
  const [notes, setNotes] = useState(draft?.notes ?? '')
  const [amountStr, setAmountStr] = useState(
    draft?.amount ? draft.amount.toFixed(2).replace('.', ',') : '',
  )
  const [category, setCategory] = useState<ExpenseCategory>(draft?.category ?? 'food')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [categorySuggestion, setCategorySuggestion] = useState<CategorizeConfidence | null>(null)
  const [paidBy, setPaidBy] = useState<'me' | 'friend'>('me')
  const [date, setDate] = useState(() => draft?.date ?? todayLocalISODate())
  const [split, setSplit] = useState<SplitResult>({
    splitType: 'equal',
    myShare: 0,
    friendShare: 0,
    valid: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { handleBlur: handleDescriptionBlur, isLoading: categorizing } = useAutoCategorize({
    description,
    enabled: !categoryTouched,
    onCategorized: (suggested, confidence) => {
      setCategory(suggested)
      setCategorySuggestion(confidence)
    },
  })

  const friend = friends.find((f) => f.id === friendId)
  const amount = useMemo(() => parseFloat(amountStr.replace(',', '.')) || 0, [amountStr])

  const canSubmit =
    !!friend && description.trim().length > 0 && amount > 0 && split.valid && !submitting

  if (friends.length === 0) {
    return (
      <Modal title="Nova despesa" onClose={onClose}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <UserPlus size={20} />
          </div>
          <p className="text-sm text-[#4b4655] dark:text-gray-300">
            Você precisa ter pelo menos um amigo confirmado antes de criar uma
            despesa.
          </p>
          <Link to="/invites" onClick={onClose}>
            <Button size="sm">
              <UserPlus size={16} /> Convidar amigo
            </Button>
          </Link>
        </div>
      </Modal>
    )
  }

  async function handleSubmit() {
    if (!canSubmit || !friend) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({
        friendId: friend.id,
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
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar despesa.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Nova despesa" onClose={onClose} wide>
      <div className="space-y-4">
        {draft?.lowConfidence && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              A leitura da nota fiscal não ficou muito nítida — confira os valores antes de
              confirmar.
            </span>
          </div>
        )}

        {friends.length > 1 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
              Com quem
            </label>
            <div className="flex gap-2">
              {friends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFriendId(f.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    friendId === f.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                      : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
                  }`}
                >
                  <Avatar name={f.name} initials={f.initials} color={f.color} picture={f.picture} size="sm" />
                  {f.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Ex: Jantar, aluguel, Uber..."
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
            placeholder={'Ex: 1x X-Salada\n1x Batata Frita M\n2x Coca-Cola Lata'}
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
                placeholder="0,00"
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
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#6b6375] dark:text-gray-400">
            Categoria
            {categorizing && <Loader2 size={12} className="animate-spin text-[#8a8593]" />}
            {!categorizing && categorySuggestion === 'low' && !categoryTouched && (
              <span className="font-normal text-[#8a8593]">(sugestão incerta)</span>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c)
                  setCategoryTouched(true)
                }}
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
            {friend && (
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
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
            Como dividir
          </label>
          {friend && (
            <SplitEditor amount={amount} friend={friend} onChange={setSplit} initial={draft?.split} />
          )}
        </div>

        {submitError && (
          <p className="rounded-lg bg-owe-50 px-3 py-2 text-xs text-owe-600">
            {submitError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} type="button">
            {submitting ? 'Salvando...' : 'Adicionar despesa'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
