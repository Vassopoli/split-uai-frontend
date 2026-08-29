import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import { useAppStore } from './useAppStore'
import type { Expense, Friend, FriendInvite, Settlement } from '../types'

vi.mock('../lib/api')

const friend: Friend = { id: 'f1', name: 'Bia', initials: 'B', color: '#fff' }
const expense: Expense = {
  id: 'e1',
  friendId: 'f1',
  description: 'Mercado',
  category: 'groceries',
  amount: 100,
  paidBy: 'me',
  splitType: 'equal',
  myShare: 50,
  friendShare: 50,
  date: '2026-03-05',
  createdAt: '2026-03-05T12:00:00Z',
  settled: false,
}
const settlement: Settlement = {
  id: 's1',
  friendId: 'f1',
  amount: 50,
  direction: 'me_to_friend',
  date: '2026-03-10',
}

function resetStore() {
  useAppStore.setState({
    friends: [],
    expenses: [],
    settlements: [],
    invites: { sent: [], received: [] },
    balances: {},
    loading: false,
    error: null,
    loaded: false,
    unreadActivityCount: 0,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetStore()
  vi.mocked(api.fetchFriendBalance).mockResolvedValue({ friendId: 'f1', amount: 0, direction: 'even' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('load', () => {
  it('loads friends, expenses, settlements, invites and balances', async () => {
    vi.mocked(api.fetchFriends).mockResolvedValue([friend])
    vi.mocked(api.fetchExpenses).mockResolvedValue([expense])
    vi.mocked(api.fetchSettlements).mockResolvedValue([settlement])
    vi.mocked(api.fetchFriendInvites).mockResolvedValue({ sent: [], received: [] })
    vi.mocked(api.fetchFriendBalance).mockResolvedValue({ friendId: 'f1', amount: 20, direction: 'friend_to_me' })

    await useAppStore.getState().load()

    const state = useAppStore.getState()
    expect(state.friends).toEqual([friend])
    expect(state.expenses).toEqual([expense])
    expect(state.settlements).toEqual([settlement])
    expect(state.balances.f1).toEqual({ friendId: 'f1', net: 20 })
    expect(state.loading).toBe(false)
    expect(state.loaded).toBe(true)
    expect(state.error).toBeNull()
  })

  it('is a no-op when already loaded', async () => {
    useAppStore.setState({ loaded: true })
    await useAppStore.getState().load()
    expect(api.fetchFriends).not.toHaveBeenCalled()
  })

  it('is a no-op when already loading', async () => {
    useAppStore.setState({ loading: true })
    await useAppStore.getState().load()
    expect(api.fetchFriends).not.toHaveBeenCalled()
  })

  it('records the error message when a fetch fails', async () => {
    vi.mocked(api.fetchFriends).mockRejectedValue(new Error('offline'))
    vi.mocked(api.fetchExpenses).mockResolvedValue([])
    vi.mocked(api.fetchSettlements).mockResolvedValue([])
    vi.mocked(api.fetchFriendInvites).mockResolvedValue({ sent: [], received: [] })

    await useAppStore.getState().load()

    const state = useAppStore.getState()
    expect(state.error).toBe('offline')
    expect(state.loading).toBe(false)
    expect(state.loaded).toBe(false)
  })

  it('falls back to a generic message for a non-Error rejection', async () => {
    vi.mocked(api.fetchFriends).mockRejectedValue('boom')
    vi.mocked(api.fetchExpenses).mockResolvedValue([])
    vi.mocked(api.fetchSettlements).mockResolvedValue([])
    vi.mocked(api.fetchFriendInvites).mockResolvedValue({ sent: [], received: [] })

    await useAppStore.getState().load()
    expect(useAppStore.getState().error).toBe('Falha ao carregar dados')
  })
})

describe('addExpense', () => {
  it('prepends the new expense and refreshes the friend balance', async () => {
    vi.mocked(api.createExpense).mockResolvedValue(expense)
    vi.mocked(api.fetchFriendBalance).mockResolvedValue({ friendId: 'f1', amount: 50, direction: 'friend_to_me' })

    await useAppStore.getState().addExpense({
      friendId: 'f1',
      description: 'Mercado',
      category: 'groceries',
      amount: 100,
      paidBy: 'me',
      splitType: 'equal',
      myShare: 50,
      friendShare: 50,
      date: '2026-03-05',
    })

    const state = useAppStore.getState()
    expect(state.expenses).toEqual([expense])
    expect(state.balances.f1).toEqual({ friendId: 'f1', net: 50 })
  })
})

describe('updateExpense', () => {
  it('replaces the matching expense and refreshes its balance', async () => {
    useAppStore.setState({ expenses: [expense] })
    const updated = { ...expense, amount: 200 }
    vi.mocked(api.updateExpense).mockResolvedValue(updated)

    await useAppStore.getState().updateExpense('e1', {
      description: 'Mercado',
      category: 'groceries',
      amount: 200,
      paidBy: 'me',
      splitType: 'equal',
      myShare: 100,
      friendShare: 100,
      date: '2026-03-05',
    })

    expect(useAppStore.getState().expenses).toEqual([updated])
  })
})

describe('deleteExpense', () => {
  it('removes the expense and refreshes the balance for its friend', async () => {
    useAppStore.setState({ expenses: [expense] })
    vi.mocked(api.deleteExpense).mockResolvedValue(undefined)

    await useAppStore.getState().deleteExpense('e1')

    expect(useAppStore.getState().expenses).toEqual([])
    expect(api.fetchFriendBalance).toHaveBeenCalledWith('f1')
  })

  it('does not blow up when the expense is already gone', async () => {
    useAppStore.setState({ expenses: [] })
    vi.mocked(api.deleteExpense).mockResolvedValue(undefined)

    await useAppStore.getState().deleteExpense('missing')
    expect(useAppStore.getState().expenses).toEqual([])
  })
})

describe('settleUp', () => {
  it('adds the settlement and marks the settled expenses when one is returned', async () => {
    useAppStore.setState({ expenses: [expense] })
    vi.mocked(api.settleUp).mockResolvedValue({ settlement, settledExpenseIds: ['e1'] })

    await useAppStore.getState().settleUp('f1')

    const state = useAppStore.getState()
    expect(state.settlements).toEqual([settlement])
    expect(state.expenses[0].settled).toBe(true)
    expect(state.expenses[0].settlementId).toBe('s1')
  })

  it('only refreshes the balance when there is nothing to settle', async () => {
    useAppStore.setState({ expenses: [expense], settlements: [] })
    vi.mocked(api.settleUp).mockResolvedValue({ settlement: null, settledExpenseIds: [] })

    await useAppStore.getState().settleUp('f1')

    expect(useAppStore.getState().settlements).toEqual([])
    expect(useAppStore.getState().expenses).toEqual([expense])
  })
})

describe('registerPayment', () => {
  it('prepends the new settlement and refreshes the balance', async () => {
    vi.mocked(api.registerPayment).mockResolvedValue(settlement)

    await useAppStore.getState().registerPayment('f1', { amount: 50, date: '2026-03-10' })

    expect(useAppStore.getState().settlements).toEqual([settlement])
  })
})

describe('inviteFriend', () => {
  it('adds the friend directly when the invite auto-accepts', async () => {
    vi.mocked(api.inviteFriend).mockResolvedValue({ status: 'accepted', friend })

    const result = await useAppStore.getState().inviteFriend('bia@example.com')

    expect(result.status).toBe('accepted')
    expect(useAppStore.getState().friends).toEqual([friend])
  })

  it('refreshes the invite lists when it stays pending', async () => {
    const invites = { sent: [{ id: 'i1' } as FriendInvite], received: [] }
    vi.mocked(api.inviteFriend).mockResolvedValue({ status: 'pending' })
    vi.mocked(api.fetchFriendInvites).mockResolvedValue(invites)

    await useAppStore.getState().inviteFriend('bia@example.com')

    expect(useAppStore.getState().invites).toEqual(invites)
    expect(useAppStore.getState().friends).toEqual([])
  })
})

describe('acceptInvite / declineInvite', () => {
  it('accepting adds the friend and removes it from received invites', async () => {
    useAppStore.setState({ invites: { sent: [], received: [{ id: 'i1' } as FriendInvite] } })
    vi.mocked(api.acceptFriendInvite).mockResolvedValue(friend)

    await useAppStore.getState().acceptInvite('i1')

    const state = useAppStore.getState()
    expect(state.friends).toEqual([friend])
    expect(state.invites.received).toEqual([])
  })

  it('declining just removes it from received invites', async () => {
    useAppStore.setState({ invites: { sent: [], received: [{ id: 'i1' } as FriendInvite] } })
    vi.mocked(api.declineFriendInvite).mockResolvedValue(undefined)

    await useAppStore.getState().declineInvite('i1')

    expect(useAppStore.getState().invites.received).toEqual([])
  })
})

describe('unread activity', () => {
  it('setUnreadActivityCount sets the count directly', () => {
    useAppStore.getState().setUnreadActivityCount(3)
    expect(useAppStore.getState().unreadActivityCount).toBe(3)
  })

  it('markActivityRead resets the count and returns the previous timestamp', async () => {
    useAppStore.setState({ unreadActivityCount: 5 })
    vi.mocked(api.markActivityLogRead).mockResolvedValue('2026-03-01T00:00:00Z')

    const previous = await useAppStore.getState().markActivityRead()

    expect(previous).toBe('2026-03-01T00:00:00Z')
    expect(useAppStore.getState().unreadActivityCount).toBe(0)
  })
})
