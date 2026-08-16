export type SplitType = 'equal' | 'exact' | 'percentage'

export type PaidBy = 'me' | 'friend'

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'home'
  | 'leisure'
  | 'shopping'
  | 'trip'
  | 'other'

export interface Friend {
  id: string
  name: string
  initials: string
  color: string
  /** Google profile picture URL. Absent if the friend never set one. */
  picture?: string
}

export interface Split {
  personId: 'me' | string
  amount: number
  percentage?: number
}

export interface Expense {
  id: string
  friendId: string
  description: string
  /** Optional item-level breakdown, e.g. from a scanned receipt. */
  notes?: string
  category: ExpenseCategory
  amount: number
  paidBy: PaidBy
  splitType: SplitType
  /** positive shares of myShare/friendShare always sum to amount */
  myShare: number
  friendShare: number
  date: string // ISO date
  createdAt: string // ISO datetime
  settled: boolean
  settlementId?: string
}

export type SettlementDirection = 'me_to_friend' | 'friend_to_me'

export type BalanceDirection = SettlementDirection | 'even'

export interface Settlement {
  id: string
  friendId: string
  amount: number
  direction: SettlementDirection
  date: string
  note?: string
}

export type ActivityItem =
  | { kind: 'expense'; data: Expense }
  | { kind: 'settlement'; data: Settlement }

export interface FriendBalance {
  friendId: string
  /** positive = friend owes me, negative = I owe friend */
  net: number
}

export type AuditAction = 'created' | 'updated' | 'deleted'
export type AuditEntityType = 'expense' | 'settlement'

export interface AuditChange {
  field: 'description' | 'category' | 'amount' | 'paidBy' | 'splitType' | 'myShare' | 'friendShare' | 'date'
  from: string | number
  to: string | number
}

export interface AuditLogEntry {
  id: string
  friendId: string
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  /** who performed the action, relative to the caller — same vocabulary as Expense.paidBy */
  actor: 'me' | 'friend'
  occurredAt: string // ISO datetime
  /** snapshot of the entity right after the action (or right before, for 'deleted') — lets the UI render something meaningful even once the entity itself is gone */
  description: string
  amount: number
  /** only present for action === 'updated'; one entry per field that actually changed */
  changes?: AuditChange[]
}

export type InviteDirection = 'sent' | 'received'

export interface FriendInvite {
  id: string
  friendId: string
  name: string
  email: string
  initials: string
  color: string
  /** Google profile picture URL. Absent if the person never set one (or, for a sent invite, never signed up yet). */
  picture?: string
  direction: InviteDirection
  createdAt: string
}
