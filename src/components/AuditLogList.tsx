import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Pencil, Trash2, History } from 'lucide-react'
import type { AuditChange, AuditLogEntry, Friend } from '../types'
import { formatBRL } from '../lib/balance'
import { CATEGORY_LABELS } from './CategoryIcon'
import { SPLIT_LABELS } from './ExpenseRow'

function monthLabel(timestamp: number): string {
  const label = format(new Date(timestamp), 'MMMM yyyy', { locale: ptBR })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function monthKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${d.getMonth()}`
}

function fieldLabel(field: AuditChange['field'], friendFirstName: string): string {
  switch (field) {
    case 'description':
      return 'descrição'
    case 'category':
      return 'categoria'
    case 'amount':
      return 'valor'
    case 'paidBy':
      return 'quem pagou'
    case 'splitType':
      return 'tipo de divisão'
    case 'myShare':
      return 'sua parte'
    case 'friendShare':
      return `parte de ${friendFirstName}`
    case 'date':
      return 'data'
  }
}

function formatFieldValue(field: AuditChange['field'], value: string | number): string {
  switch (field) {
    case 'amount':
    case 'myShare':
    case 'friendShare':
      return formatBRL(Number(value))
    case 'category':
      return CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS] ?? String(value)
    case 'splitType':
      return SPLIT_LABELS[value as keyof typeof SPLIT_LABELS] ?? String(value)
    case 'paidBy':
      return value === 'me' ? 'Você' : 'Amigo'
    default:
      return String(value)
  }
}

const ACTION_META: Record<
  AuditLogEntry['action'],
  { icon: typeof Plus; iconClass: string; verb: string }
> = {
  created: { icon: Plus, iconClass: 'bg-owed-50 text-owed-600', verb: 'adicionou' },
  updated: { icon: Pencil, iconClass: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300', verb: 'editou' },
  deleted: { icon: Trash2, iconClass: 'bg-owe-50 text-owe-600', verb: 'excluiu' },
}

function AuditRow({ entry, friend, unread }: { entry: AuditLogEntry; friend: Friend; unread: boolean }) {
  const firstName = friend.name.split(' ')[0]
  const actorName = entry.actor === 'me' ? 'Você' : firstName
  const { icon: Icon, iconClass, verb } = ACTION_META[entry.action]
  const noun = entry.entityType === 'expense' ? 'uma despesa' : 'um acerto'

  return (
    <div
      className={`flex items-start gap-4 px-4 py-3.5 sm:px-5 ${
        unread ? 'bg-owe-50/60 dark:bg-owe-500/10' : ''
      }`}
    >
      <div className="relative shrink-0">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {unread && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-owe-500 ring-2 ring-white dark:ring-[#1a1621]"
            title="Não lida"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#12251f] dark:text-white">
          <span className="font-medium">{actorName}</span> {verb} {noun}
        </p>
        <p
          className={`truncate text-sm ${
            entry.action === 'deleted'
              ? 'text-[#8a8593] line-through'
              : 'font-medium text-[#12251f] dark:text-white'
          }`}
        >
          {entry.description} · {formatBRL(entry.amount)}
        </p>
        {entry.changes && entry.changes.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {entry.changes.map((change) => (
              <li key={change.field} className="text-xs text-[#8a8593]">
                {fieldLabel(change.field, firstName)}: {formatFieldValue(change.field, change.from)} → {formatFieldValue(change.field, change.to)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="shrink-0 text-right text-[11px] text-[#8a8593]">
        {format(new Date(entry.occurredAt), "d MMM, HH:mm", { locale: ptBR })}
      </div>
    </div>
  )
}

export function AuditLogList({
  entries,
  friendsById,
  unreadCutoff = null,
  emptyMessage = 'Nenhuma atividade registrada ainda.',
}: {
  entries: AuditLogEntry[]
  friendsById: Record<string, Friend>
  /** last_read_at de antes dessa visita (RFC3339). Entradas de amigos depois
   *  desse instante são destacadas como não lidas — ações do próprio usuário
   *  nunca contam, no mesmo critério do backend pro badge. */
  unreadCutoff?: string | null
  emptyMessage?: string
}) {
  const cutoffMs = unreadCutoff ? new Date(unreadCutoff).getTime() : null
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-[#8a8593]">
        <History className="h-6 w-6" strokeWidth={1.5} />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )

  let lastKey: string | null = null
  const nodes: ReactNode[] = []
  for (const entry of sorted) {
    const friend = friendsById[entry.friendId]
    if (!friend) continue
    const ts = new Date(entry.occurredAt).getTime()
    const key = monthKey(ts)
    if (key !== lastKey) {
      lastKey = key
      nodes.push(
        <div
          key={`month-${key}`}
          className="bg-black/[0.02] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8593] dark:bg-white/[0.03] sm:px-5"
        >
          {monthLabel(ts)}
        </div>,
      )
    }
    const unread = entry.actor === 'friend' && cutoffMs !== null && ts > cutoffMs
    nodes.push(<AuditRow key={entry.id} entry={entry} friend={friend} unread={unread} />)
  }

  return <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">{nodes}</div>
}
