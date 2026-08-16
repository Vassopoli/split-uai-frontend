import type { BalanceDirection, Expense, Friend, FriendInvite, Settlement } from '../types'
import { getAccessToken } from './authToken'

/**
 * Real API client — talks to the backend described in
 * docs/backend-api-contract.md. Every exported function here keeps the same
 * signature the mock version used to have, so callers (the Zustand store)
 * didn't need to change.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL

interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const url = `${BASE_URL}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let apiMessage: string | undefined
    try {
      apiMessage = ((await res.json()) as ApiErrorBody).error?.message
    } catch {
      // resposta não era JSON
    }
    throw new Error(apiMessage ?? `Erro ${res.status} ao chamar a API.`)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export interface UpsertMeInput {
  name?: string
  email?: string
  picture?: string
}

export async function upsertMe(input: UpsertMeInput): Promise<void> {
  await request<void>('/me', { method: 'POST', body: JSON.stringify(input) })
}

export async function fetchFriends(): Promise<Friend[]> {
  return request<Friend[]>('/friends')
}

export interface InviteFriendResult {
  status: 'pending' | 'accepted'
  friend?: Friend
}

export async function inviteFriend(email: string): Promise<InviteFriendResult> {
  return request<InviteFriendResult>('/friends/invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export interface FriendInvitesResponse {
  sent: FriendInvite[]
  received: FriendInvite[]
}

export async function fetchFriendInvites(): Promise<FriendInvitesResponse> {
  return request<FriendInvitesResponse>('/friends/invites')
}

export async function acceptFriendInvite(inviteId: string): Promise<Friend> {
  return request<Friend>(`/friends/invites/${encodeURIComponent(inviteId)}/accept`, {
    method: 'POST',
  })
}

export async function declineFriendInvite(inviteId: string): Promise<void> {
  await request<{ ok: boolean }>(
    `/friends/invites/${encodeURIComponent(inviteId)}/decline`,
    { method: 'POST' },
  )
}

export async function fetchExpenses(friendId?: string): Promise<Expense[]> {
  const query = friendId ? `?friendId=${encodeURIComponent(friendId)}` : ''
  return request<Expense[]>(`/expenses${query}`)
}

export async function fetchSettlements(friendId?: string): Promise<Settlement[]> {
  const query = friendId ? `?friendId=${encodeURIComponent(friendId)}` : ''
  return request<Settlement[]>(`/settlements${query}`)
}

export interface CreateExpenseInput {
  friendId: string
  description: string
  notes?: string
  category: Expense['category']
  amount: number
  paidBy: Expense['paidBy']
  splitType: Expense['splitType']
  myShare: number
  friendShare: number
  date: string
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  return request<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type UpdateExpenseInput = Omit<CreateExpenseInput, 'friendId'>

export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<Expense> {
  return request<Expense>(`/expenses/${encodeURIComponent(expenseId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await request<void>(`/expenses/${encodeURIComponent(expenseId)}`, {
    method: 'DELETE',
  })
}

export interface FriendBalanceResponse {
  friendId: string
  amount: number
  direction: BalanceDirection
}

export async function fetchFriendBalance(friendId: string): Promise<FriendBalanceResponse> {
  return request<FriendBalanceResponse>(`/friends/${encodeURIComponent(friendId)}/balance`)
}

export interface SettleUpResult {
  settlement: Settlement | null
  settledExpenseIds: string[]
}

export async function settleUp(friendId: string): Promise<SettleUpResult> {
  const result = await request<SettleUpResult | null>(
    `/friends/${encodeURIComponent(friendId)}/settle`,
    { method: 'POST' },
  )
  return result ?? { settlement: null, settledExpenseIds: [] }
}

export type ScanConfidence = 'high' | 'low'

export interface ScanReceiptItem {
  description: string
  amount: number
}

export interface ScanReceiptResult {
  merchantName: string
  purchasedAt: string
  category: Expense['category']
  /** Short ready-to-use title, e.g. "Lanche no BK" — not a list of items. */
  description: string
  /** Item breakdown as text, e.g. "1x X-Salada, 1x Batata Frita M". */
  notes: string
  items: ScanReceiptItem[]
  fees: number
  discounts: number
  total: number
  confidence: ScanConfidence
}

export type ScanReceiptOutcome =
  | { status: 'ok'; data: ScanReceiptResult }
  | { status: 'unreadable' }
  | { status: 'rate_limited'; retryAfterSeconds: number }

/**
 * Multipart upload, so it can't go through request() (no JSON Content-Type,
 * and 422/429 are expected outcomes the UI branches on, not failures to
 * throw). The AI call behind this can take ~20s — there's no client timeout
 * here, the caller is expected to show a loading state for that long.
 */
export async function scanReceipt(receipt: Blob): Promise<ScanReceiptOutcome> {
  const token = await getAccessToken()
  const body = new FormData()
  body.append('receipt', receipt, 'receipt.jpg')

  const res = await fetch(`${BASE_URL}/expenses/scan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })

  if (res.status === 422) return { status: 'unreadable' }
  if (res.status === 429) {
    const retryAfterSeconds = Number(res.headers.get('Retry-After')) || 600
    return { status: 'rate_limited', retryAfterSeconds }
  }

  if (!res.ok) {
    let apiMessage: string | undefined
    try {
      apiMessage = ((await res.json()) as ApiErrorBody).error?.message
    } catch {
      // resposta não era JSON
    }
    throw new Error(apiMessage ?? `Erro ${res.status} ao escanear nota fiscal.`)
  }

  return { status: 'ok', data: (await res.json()) as ScanReceiptResult }
}

export interface CreatePaymentInput {
  amount: number
  date: string
  note?: string
}

export async function registerPayment(
  friendId: string,
  input: CreatePaymentInput,
): Promise<Settlement> {
  return request<Settlement>(`/friends/${encodeURIComponent(friendId)}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
