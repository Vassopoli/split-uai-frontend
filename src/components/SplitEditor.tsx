import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { SplitType, Friend } from '../types'
import { formatBRL, round2 } from '../lib/balance'
import { MeAvatar, Avatar } from './Avatar'

export interface SplitResult {
  splitType: SplitType
  myShare: number
  friendShare: number
  valid: boolean
  /** Set only while the "por item" tab is active — the total is derived from
   * the item list instead of typed in, so the caller should treat this as
   * the authoritative amount instead of whatever's in its own amount field. */
  itemizedAmount?: number
  /** Set alongside itemizedAmount — a plain-text breakdown of the items and
   * who they belong to, since the items themselves aren't persisted anywhere
   * else. The caller should write this into its own notes field. */
  itemizedNotes?: string
}

interface ItemRow {
  id: string
  label: string
  amountStr: string
  mine: boolean
  theirs: boolean
}

/** Not a real SplitType — itemizing always resolves to an 'exact' split once
 * shares are computed, this is just the tab the user picked. */
type TabValue = SplitType | 'itemized'

const TABS: { value: TabValue; label: string }[] = [
  { value: 'equal', label: 'Igualmente' },
  { value: 'exact', label: 'Por valor' },
  { value: 'percentage', label: 'Porcentagem' },
  { value: 'itemized', label: 'Por item' },
]

function newItemRow(): ItemRow {
  return { id: Math.random().toString(36).slice(2), label: '', amountStr: '', mine: false, theirs: false }
}

export function SplitEditor({
  amount,
  friend,
  onChange,
  initial,
}: {
  amount: number
  friend: Friend
  onChange: (result: SplitResult) => void
  initial?: { splitType: SplitType; myShare: number; friendShare: number }
}) {
  const [splitType, setSplitType] = useState<TabValue>(initial?.splitType ?? 'equal')
  const [myExact, setMyExact] = useState(initial ? initial.myShare.toFixed(2) : '')
  const [friendExact, setFriendExact] = useState(initial ? initial.friendShare.toFixed(2) : '')
  const [myPct, setMyPct] = useState(
    initial && amount ? round2((initial.myShare / amount) * 100).toString() : '50',
  )
  const [friendPct, setFriendPct] = useState(
    initial && amount ? round2((initial.friendShare / amount) * 100).toString() : '50',
  )
  const [items, setItems] = useState<ItemRow[]>([newItemRow()])

  // seed exact fields with an equal split whenever the amount actually
  // changes — compares against the last amount we seeded for (not "is this
  // the first effect run") so it stays correct under StrictMode's double
  // effect invocation in dev, and doesn't stomp a saved split (`initial`)
  // on mount
  const lastSeededAmount = useRef(amount)
  useEffect(() => {
    if (amount === lastSeededAmount.current) return
    lastSeededAmount.current = amount
    const half = round2(amount / 2)
    setMyExact(half ? half.toFixed(2) : '')
    setFriendExact(amount ? round2(amount - half).toFixed(2) : '')
  }, [amount])

  const filledItems = useMemo(
    () => items.filter((it) => it.label.trim().length > 0 || parseFloat(it.amountStr.replace(',', '.')) > 0),
    [items],
  )
  const unassignedItems = useMemo(
    () => filledItems.filter((it) => !it.mine && !it.theirs),
    [filledItems],
  )
  const itemsTotal = round2(
    filledItems.reduce((sum, it) => sum + (parseFloat(it.amountStr.replace(',', '.')) || 0), 0),
  )
  const itemsNotes = useMemo(
    () =>
      filledItems
        .map((it) => {
          const label = it.label.trim() || 'Item'
          const value = formatBRL(parseFloat(it.amountStr.replace(',', '.')) || 0)
          const owner =
            it.mine && it.theirs ? 'dividido' : it.mine ? 'você' : it.theirs ? friend.name.split(' ')[0] : '?'
          return `${label} — ${value} (${owner})`
        })
        .join('\n'),
    [filledItems, friend.name],
  )

  const result: SplitResult = useMemo(() => {
    if (splitType === 'itemized') {
      if (filledItems.length === 0 || itemsTotal <= 0 || unassignedItems.length > 0) {
        return {
          splitType: 'exact',
          myShare: 0,
          friendShare: 0,
          valid: false,
          itemizedAmount: itemsTotal,
          itemizedNotes: itemsNotes,
        }
      }
      let myRaw = 0
      for (const it of filledItems) {
        const amt = parseFloat(it.amountStr.replace(',', '.')) || 0
        if (it.mine && it.theirs) myRaw += amt / 2
        else if (it.mine) myRaw += amt
      }
      const myShare = round2(myRaw)
      const friendShare = round2(itemsTotal - myShare)
      return {
        splitType: 'exact',
        myShare,
        friendShare,
        valid: true,
        itemizedAmount: itemsTotal,
        itemizedNotes: itemsNotes,
      }
    }

    if (!amount || amount <= 0) {
      return { splitType, myShare: 0, friendShare: 0, valid: false }
    }

    if (splitType === 'equal') {
      const half = round2(amount / 2)
      const rest = round2(amount - half)
      return { splitType, myShare: half, friendShare: rest, valid: true }
    }

    if (splitType === 'exact') {
      const my = round2(parseFloat(myExact.replace(',', '.')) || 0)
      const fr = round2(parseFloat(friendExact.replace(',', '.')) || 0)
      const valid = Math.abs(my + fr - amount) < 0.01 && my >= 0 && fr >= 0
      return { splitType, myShare: my, friendShare: fr, valid }
    }

    // percentage
    const myP = parseFloat(myPct.replace(',', '.')) || 0
    const frP = parseFloat(friendPct.replace(',', '.')) || 0
    const valid = Math.abs(myP + frP - 100) < 0.01 && myP >= 0 && frP >= 0
    return {
      splitType,
      myShare: round2((amount * myP) / 100),
      friendShare: round2((amount * frP) / 100),
      valid,
    }
  }, [amount, splitType, myExact, friendExact, myPct, friendPct, filledItems, itemsTotal, unassignedItems, itemsNotes])

  useEffect(() => {
    onChange(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  function updateItem(id: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  function toggleOwner(id: string, who: 'mine' | 'theirs') {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [who]: !it[who] } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, newItemRow()])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  return (
    <div>
      <div className="flex gap-1 rounded-xl bg-black/[0.04] p-1 dark:bg-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSplitType(tab.value)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
              splitType === tab.value
                ? 'bg-white text-[#12251f] shadow-sm dark:bg-white/10 dark:text-white'
                : 'text-[#6b6375] hover:text-[#12251f] dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {splitType === 'equal' && (
          <div className="flex items-center justify-between text-sm">
            <PersonLabel type="me" />
            <span className="font-medium text-[#12251f] dark:text-white">
              {formatBRL(result.myShare)}
            </span>
          </div>
        )}
        {splitType === 'equal' && (
          <div className="flex items-center justify-between text-sm">
            <PersonLabel type="friend" friend={friend} />
            <span className="font-medium text-[#12251f] dark:text-white">
              {formatBRL(result.friendShare)}
            </span>
          </div>
        )}

        {splitType === 'exact' && (
          <>
            <ShareInput
              label={<PersonLabel type="me" />}
              value={myExact}
              onChange={setMyExact}
              prefix="R$"
            />
            <ShareInput
              label={<PersonLabel type="friend" friend={friend} />}
              value={friendExact}
              onChange={setFriendExact}
              prefix="R$"
            />
          </>
        )}

        {splitType === 'percentage' && (
          <>
            <ShareInput
              label={<PersonLabel type="me" />}
              value={myPct}
              onChange={setMyPct}
              suffix="%"
            />
            <ShareInput
              label={<PersonLabel type="friend" friend={friend} />}
              value={friendPct}
              onChange={setFriendPct}
              suffix="%"
            />
          </>
        )}

        {splitType === 'itemized' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <input
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                    placeholder={`Item ${idx + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                  <div className="flex w-[5.5rem] shrink-0 items-center gap-1 rounded-lg border border-black/10 bg-white px-2 py-1.5 dark:border-white/15 dark:bg-white/5">
                    <span className="text-xs text-[#8a8593]">R$</span>
                    <input
                      inputMode="decimal"
                      value={item.amountStr}
                      onChange={(e) => updateItem(item.id, { amountStr: e.target.value })}
                      placeholder="0,00"
                      className="w-full min-w-0 bg-transparent text-sm text-[#12251f] outline-none dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleOwner(item.id, 'mine')}
                    title="Seu"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-opacity ${
                      item.mine ? 'border-brand-500 opacity-100' : 'border-transparent opacity-30 hover:opacity-60'
                    }`}
                  >
                    <MeAvatar size="xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleOwner(item.id, 'theirs')}
                    title={friend.name}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-opacity ${
                      item.theirs ? 'border-brand-500 opacity-100' : 'border-transparent opacity-30 hover:opacity-60'
                    }`}
                  >
                    <Avatar name={friend.name} initials={friend.initials} color={friend.color} picture={friend.picture} size="xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    title="Remover item"
                    className="shrink-0 text-[#8a8593] hover:text-owe-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              <Plus size={14} /> Adicionar item
            </button>

            {filledItems.length > 0 && (
              <div className="space-y-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between text-sm">
                  <PersonLabel type="me" />
                  <span className="font-medium text-[#12251f] dark:text-white">
                    {formatBRL(result.myShare)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <PersonLabel type="friend" friend={friend} />
                  <span className="font-medium text-[#12251f] dark:text-white">
                    {formatBRL(result.friendShare)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-black/10 pt-2 text-xs text-[#6b6375] dark:border-white/10 dark:text-gray-400">
                  <span>Total dos itens</span>
                  <span>{formatBRL(itemsTotal)}</span>
                </div>
              </div>
            )}

            {unassignedItems.length > 0 && (
              <p className="rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/15 dark:text-amber-300">
                Marque de quem é: {unassignedItems.map((it, i) => it.label.trim() || `item ${i + 1}`).join(', ')}
              </p>
            )}
          </div>
        )}

        {amount > 0 && splitType === 'exact' && (() => {
          const my = round2(parseFloat(myExact.replace(',', '.')) || 0)
          const fr = round2(parseFloat(friendExact.replace(',', '.')) || 0)
          const diff = round2(amount - (my + fr))
          if (Math.abs(diff) < 0.01) return null
          return (
            <p className="text-xs text-owe-600">
              {diff > 0
                ? `Faltam ${formatBRL(diff)} para completar ${formatBRL(amount)}.`
                : `Passou ${formatBRL(Math.abs(diff))} do total de ${formatBRL(amount)}.`}
            </p>
          )
        })()}

        {amount > 0 && splitType === 'percentage' && (() => {
          const myP = parseFloat(myPct.replace(',', '.')) || 0
          const frP = parseFloat(friendPct.replace(',', '.')) || 0
          const diff = round2(100 - (myP + frP))
          if (Math.abs(diff) < 0.01) return null
          return (
            <p className="text-xs text-owe-600">
              {diff > 0
                ? `Faltam ${diff}% para completar 100%.`
                : `Passou ${Math.abs(diff)}% de 100%.`}
            </p>
          )
        })()}
      </div>
    </div>
  )
}

function PersonLabel({ type, friend }: { type: 'me' | 'friend'; friend?: Friend }) {
  return (
    <span className="flex items-center gap-2">
      {type === 'me' ? (
        <MeAvatar size="sm" />
      ) : (
        <Avatar
          name={friend!.name}
          initials={friend!.initials}
          color={friend!.color}
          picture={friend!.picture}
          size="sm"
        />
      )}
      {type === 'me' ? 'Você' : friend!.name.split(' ')[0]}
    </span>
  )
}

function ShareInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  prefix?: string
  suffix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      {label}
      <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 dark:border-white/15 dark:bg-white/5">
        {prefix && <span className="text-xs text-[#8a8593]">{prefix}</span>}
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 bg-transparent text-right text-sm text-[#12251f] outline-none dark:text-white"
        />
        {suffix && <span className="text-xs text-[#8a8593]">{suffix}</span>}
      </div>
    </div>
  )
}
