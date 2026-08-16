import { useMemo, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import type { Friend } from '../types'
import type { ScanReceiptItem } from '../lib/api'
import { Modal } from './Modal'
import { Button } from './Button'
import { Avatar } from './Avatar'
import { formatBRL, round2 } from '../lib/balance'

interface ItemRow {
  key: string
  label: string
  amount: number
}

export interface ItemizeResult {
  friendId: string
  myShare: number
  friendShare: number
}

/**
 * Lets the user assign each receipt item (and the delivery/service fee, if
 * any) to themselves and/or the friend, across two passes over the same
 * list. Discounts are deliberately not itemizable here — they're not a
 * line item, they get folded in proportionally to each person's raw total
 * once both passes are done, so myShare + friendShare still lands on
 * `total` exactly.
 */
export function ItemizeExpenseModal({
  friends,
  defaultFriendId,
  items,
  fees,
  discounts,
  total,
  onConfirm,
  onSkip,
}: {
  friends: Friend[]
  defaultFriendId?: string
  items: ScanReceiptItem[]
  fees: number
  discounts: number
  total: number
  onConfirm: (result: ItemizeResult) => void
  onSkip: () => void
}) {
  const rows = useMemo<ItemRow[]>(() => {
    const base = items.map((item, i) => ({ key: `item-${i}`, label: item.description, amount: item.amount }))
    if (fees > 0) base.push({ key: 'fee', label: 'Taxa de entrega', amount: fees })
    return base
  }, [items, fees])

  const [friendId, setFriendId] = useState(defaultFriendId ?? friends[0]?.id ?? '')
  const [step, setStep] = useState<'friend' | 'me' | 'theirs'>(
    friends.length > 1 && !defaultFriendId ? 'friend' : 'me',
  )
  const [mine, setMine] = useState<Record<string, boolean>>({})
  const [theirs, setTheirs] = useState<Record<string, boolean>>({})

  const friend = friends.find((f) => f.id === friendId)
  const isMeStep = step === 'me'
  const selection = isMeStep ? mine : theirs
  const setSelection = isMeStep ? setMine : setTheirs

  function toggleKey(key: string) {
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const unassigned = rows.filter((r) => !mine[r.key] && !theirs[r.key])
  const canConfirm = unassigned.length === 0
  const canGoBack = step === 'theirs' || (step === 'me' && friends.length > 1)

  function goBack() {
    if (step === 'theirs') setStep('me')
    else if (step === 'me' && friends.length > 1) setStep('friend')
  }

  function handleConfirm() {
    if (!canConfirm) return
    let myRaw = 0
    let friendRaw = 0
    for (const r of rows) {
      const m = !!mine[r.key]
      const t = !!theirs[r.key]
      if (m && t) {
        myRaw += r.amount / 2
        friendRaw += r.amount / 2
      } else if (m) {
        myRaw += r.amount
      } else if (t) {
        friendRaw += r.amount
      }
    }
    myRaw = round2(myRaw)
    friendRaw = round2(friendRaw)
    const rawSum = myRaw + friendRaw
    const myShare = rawSum > 0 ? round2(myRaw - discounts * (myRaw / rawSum)) : round2(total / 2)
    const friendShare = round2(total - myShare)
    onConfirm({ friendId, myShare, friendShare })
  }

  if (step === 'friend') {
    return (
      <Modal title="Com quem foi essa despesa?" onClose={onSkip}>
        <div className="space-y-4">
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
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-2 text-xs text-[#6b6375] underline-offset-2 hover:underline dark:text-gray-400"
            >
              Pular, dividir igualmente
            </button>
            <Button onClick={() => setStep('me')} disabled={!friendId} type="button">
              Continuar
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  if (!friend) return null

  return (
    <Modal
      title={isMeStep ? 'Quais itens são seus?' : `Quais itens são de ${friend.name.split(' ')[0]}?`}
      onClose={onSkip}
    >
      <div className="space-y-4">
        <p className="text-sm text-[#4b4655] dark:text-gray-300">
          {isMeStep
            ? 'Marque os itens que são seus. Se um item é dos dois, marque nas duas telas — a gente divide.'
            : `Agora marque os itens que são de ${friend.name.split(' ')[0]}.`}
        </p>

        <div className="space-y-1.5">
          {rows.map((r) => {
            const checked = !!selection[r.key]
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => toggleKey(r.key)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  checked
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      checked
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-black/20 dark:border-white/25'
                    }`}
                  >
                    {checked && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="truncate">{r.label}</span>
                </span>
                <span className="shrink-0 font-medium">{formatBRL(r.amount)}</span>
              </button>
            )
          })}
        </div>

        {!isMeStep && !canConfirm && (
          <p className="text-xs text-owe-600">
            Marque quem ficou com {unassigned.length > 1 ? 'esses itens' : 'esse item'} antes de
            confirmar.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {canGoBack ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 py-2 text-xs text-[#6b6375] hover:underline dark:text-gray-400"
            >
              <ChevronLeft size={14} /> Voltar
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-2 text-xs text-[#6b6375] underline-offset-2 hover:underline dark:text-gray-400"
            >
              Pular, dividir igualmente
            </button>
            {isMeStep ? (
              <Button onClick={() => setStep('theirs')} type="button">
                Continuar
              </Button>
            ) : (
              <Button onClick={handleConfirm} disabled={!canConfirm} type="button">
                Confirmar divisão
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
