import { create } from 'zustand'
import type { Expense, Friend, FriendBalance, FriendInvite, Settlement } from '../types'
import * as api from '../lib/api'
import type {
  CreateExpenseInput,
  CreatePaymentInput,
  InviteFriendResult,
  UpdateExpenseInput,
} from '../lib/api'
import { balanceFromResponse } from '../lib/balance'

interface FriendInvites {
  sent: FriendInvite[]
  received: FriendInvite[]
}

async function fetchBalance(friendId: string): Promise<FriendBalance> {
  return balanceFromResponse(await api.fetchFriendBalance(friendId))
}

async function fetchAppData() {
  const [friends, expenses, settlements, invites] = await Promise.all([
    api.fetchFriends(),
    api.fetchExpenses(),
    api.fetchSettlements(),
    api.fetchFriendInvites(),
  ])
  const balanceEntries = await Promise.all(
    friends.map(async (f) => [f.id, await fetchBalance(f.id)] as const),
  )
  return {
    friends,
    expenses,
    settlements,
    invites,
    balances: Object.fromEntries(balanceEntries),
  }
}

interface AppState {
  friends: Friend[]
  expenses: Expense[]
  settlements: Settlement[]
  invites: FriendInvites
  balances: Record<string, FriendBalance>
  loading: boolean
  error: string | null
  loaded: boolean
  unreadActivityCount: number

  load: () => Promise<void>
  /** Refaz o fetch de tudo (amigos, despesas, acertos, saldos) sem passar
   *  pela guarda de `loaded` — usado pra puxar mudanças feitas pelo outro
   *  lado (ex: um pagamento que ele registrou) que não chegam via nenhuma
   *  ação local. Falha em silêncio: é best-effort, chamado em background
   *  pelo polling de atividades. */
  refresh: () => Promise<void>
  addExpense: (input: CreateExpenseInput) => Promise<void>
  updateExpense: (expenseId: string, input: UpdateExpenseInput) => Promise<void>
  deleteExpense: (expenseId: string) => Promise<void>
  settleUp: (friendId: string) => Promise<void>
  registerPayment: (friendId: string, input: CreatePaymentInput) => Promise<void>
  inviteFriend: (email: string) => Promise<InviteFriendResult>
  acceptInvite: (inviteId: string) => Promise<void>
  declineInvite: (inviteId: string) => Promise<void>
  setUnreadActivityCount: (count: number) => void
  /** Marca o feed como lido e devolve o last_read_at anterior (RFC3339), pra
   *  quem chamou saber quais entradas já carregadas eram as não lidas. */
  markActivityRead: () => Promise<string>
}

export const useAppStore = create<AppState>((set, get) => ({
  friends: [],
  expenses: [],
  settlements: [],
  invites: { sent: [], received: [] },
  balances: {},
  loading: false,
  error: null,
  loaded: false,
  unreadActivityCount: 0,

  load: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true, error: null })
    try {
      const data = await fetchAppData()
      set({ ...data, loading: false, loaded: true })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Falha ao carregar dados',
      })
    }
  },

  refresh: async () => {
    if (!get().loaded) return
    try {
      set(await fetchAppData())
    } catch {
      // best-effort — o próximo poll de atividades tenta de novo
    }
  },

  addExpense: async (input) => {
    const expense = await api.createExpense(input)
    const balance = await fetchBalance(expense.friendId)
    set((state) => ({
      expenses: [expense, ...state.expenses],
      balances: { ...state.balances, [expense.friendId]: balance },
    }))
  },

  updateExpense: async (expenseId, input) => {
    const expense = await api.updateExpense(expenseId, input)
    const balance = await fetchBalance(expense.friendId)
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === expenseId ? expense : e)),
      balances: { ...state.balances, [expense.friendId]: balance },
    }))
  },

  deleteExpense: async (expenseId) => {
    const friendId = get().expenses.find((e) => e.id === expenseId)?.friendId
    await api.deleteExpense(expenseId)
    const balance = friendId ? await fetchBalance(friendId) : undefined
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== expenseId),
      balances: balance ? { ...state.balances, [friendId as string]: balance } : state.balances,
    }))
  },

  settleUp: async (friendId) => {
    const result = await api.settleUp(friendId)
    const settlement = result.settlement
    const balance = await fetchBalance(friendId)
    set((state) => ({
      balances: { ...state.balances, [friendId]: balance },
      ...(settlement
        ? {
            settlements: [settlement, ...state.settlements],
            expenses: state.expenses.map((e) =>
              result.settledExpenseIds.includes(e.id)
                ? { ...e, settled: true, settlementId: settlement.id }
                : e,
            ),
          }
        : {}),
    }))
  },

  registerPayment: async (friendId, input) => {
    const settlement = await api.registerPayment(friendId, input)
    const balance = await fetchBalance(friendId)
    set((state) => ({
      settlements: [settlement, ...state.settlements],
      balances: { ...state.balances, [friendId]: balance },
    }))
  },

  inviteFriend: async (email) => {
    const result = await api.inviteFriend(email)
    if (result.status === 'accepted' && result.friend) {
      const friend = result.friend
      set((state) => ({ friends: [...state.friends, friend] }))
    } else {
      const invites = await api.fetchFriendInvites()
      set({ invites })
    }
    return result
  },

  acceptInvite: async (inviteId) => {
    const friend = await api.acceptFriendInvite(inviteId)
    set((state) => ({
      friends: [...state.friends, friend],
      invites: {
        ...state.invites,
        received: state.invites.received.filter((i) => i.id !== inviteId),
      },
    }))
  },

  declineInvite: async (inviteId) => {
    await api.declineFriendInvite(inviteId)
    set((state) => ({
      invites: {
        ...state.invites,
        received: state.invites.received.filter((i) => i.id !== inviteId),
      },
    }))
  },

  setUnreadActivityCount: (count) => set({ unreadActivityCount: count }),

  markActivityRead: async () => {
    const previousLastReadAt = await api.markActivityLogRead()
    set({ unreadActivityCount: 0 })
    return previousLastReadAt
  },
}))
