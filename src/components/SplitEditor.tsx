import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { SplitType, Friend } from '../types'
import { formatBRL, round2 } from '../lib/balance'
import { MeAvatar, Avatar } from './Avatar'

export interface SplitResult {
  splitType: SplitType
  myShare: number
  friendShare: number
  valid: boolean
}

const TABS: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Igualmente' },
  { value: 'exact', label: 'Por valor' },
  { value: 'percentage', label: 'Porcentagem' },
]

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
  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType ?? 'equal')
  const [myExact, setMyExact] = useState(initial ? initial.myShare.toFixed(2) : '')
  const [friendExact, setFriendExact] = useState(initial ? initial.friendShare.toFixed(2) : '')
  const [myPct, setMyPct] = useState(
    initial && amount ? round2((initial.myShare / amount) * 100).toString() : '50',
  )
  const [friendPct, setFriendPct] = useState(
    initial && amount ? round2((initial.friendShare / amount) * 100).toString() : '50',
  )

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

  const result: SplitResult = useMemo(() => {
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
  }, [amount, splitType, myExact, friendExact, myPct, friendPct])

  useEffect(() => {
    onChange(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

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
