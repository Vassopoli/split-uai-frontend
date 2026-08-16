import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2 } from 'lucide-react'
import type { Friend, Settlement } from '../types'
import { formatBRL } from '../lib/balance'
import { parseLocalDate } from '../lib/date'

export function SettlementRow({
  settlement,
  friend,
}: {
  settlement: Settlement
  friend: Friend
}) {
  const firstName = friend.name.split(' ')[0]
  const label =
    settlement.direction === 'friend_to_me'
      ? `${firstName} te pagou`
      : `Você pagou ${firstName}`

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
      <div className="hidden w-[52px] shrink-0 sm:block" />
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#12251f] dark:text-white">
          {label}
        </p>
        <p className="truncate text-xs text-[#8a8593]">
          {settlement.note ?? 'Acerto de contas'}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-[#12251f] dark:text-white">
          {formatBRL(settlement.amount)}
        </p>
        <p className="text-[11px] text-[#8a8593]">
          {format(parseLocalDate(settlement.date), 'd MMM', { locale: ptBR })}
        </p>
      </div>
    </div>
  )
}
