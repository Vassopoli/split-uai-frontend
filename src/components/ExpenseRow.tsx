import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Expense, Friend } from '../types'
import { CategoryIcon } from './CategoryIcon'
import { formatBRL } from '../lib/balance'
import { parseLocalDate } from '../lib/date'

const SPLIT_LABELS: Record<Expense['splitType'], string> = {
  equal: 'Dividido igualmente',
  exact: 'Dividido por valor',
  percentage: 'Dividido por porcentagem',
}

export function ExpenseRow({
  expense,
  friend,
  onClick,
}: {
  expense: Expense
  friend: Friend
  onClick?: () => void
}) {
  const iOwe = expense.paidBy === 'friend'
  const myNet = iOwe ? -expense.myShare : expense.friendShare

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3.5 sm:px-5 cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
    >
      <div className="hidden flex-col items-center text-[11px] leading-tight text-[#8a8593] sm:flex">
        <span>{format(parseLocalDate(expense.date), 'd MMM', { locale: ptBR })}</span>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[#4b4655] dark:bg-white/10 dark:text-gray-300">
        <CategoryIcon category={expense.category} className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#12251f] dark:text-white">
          {expense.description}
        </p>
        <p className="truncate text-xs text-[#8a8593]">
          {expense.paidBy === 'me' ? 'Você' : friend.name.split(' ')[0]} pagou{' '}
          {formatBRL(expense.amount)} · {SPLIT_LABELS[expense.splitType]}
        </p>
        {expense.notes && (
          <p className="truncate text-xs text-[#8a8593]">{expense.notes}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold ${
            expense.settled
              ? 'text-[#8a8593]'
              : myNet >= 0
                ? 'text-owed-600'
                : 'text-owe-600'
          }`}
        >
          {expense.settled
            ? 'Quitado'
            : myNet >= 0
              ? `+ ${formatBRL(myNet)}`
              : `- ${formatBRL(myNet)}`}
        </p>
        <p className="text-[11px] text-[#8a8593]">
          {expense.settled
            ? format(parseLocalDate(expense.date), 'd MMM', { locale: ptBR })
            : myNet >= 0
              ? 'você recebe'
              : 'você deve'}
        </p>
      </div>
    </div>
  )
}
