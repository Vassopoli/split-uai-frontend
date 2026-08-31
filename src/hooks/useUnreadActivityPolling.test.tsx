import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { useUnreadActivityPolling } from './useUnreadActivityPolling'

vi.mock('../lib/api')

function wrapper(path: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  useAppStore.setState({ unreadActivityCount: 0, loaded: false })
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useUnreadActivityPolling', () => {
  it('polls immediately on mount and sets the unread count', async () => {
    vi.mocked(api.fetchUnreadActivityCount).mockResolvedValue(3)
    renderHook(() => useUnreadActivityPolling(), { wrapper: wrapper('/') })

    await act(async () => {
      await Promise.resolve()
    })

    expect(useAppStore.getState().unreadActivityCount).toBe(3)
  })

  it('marks the feed read instead of setting the count when parked on /activity', async () => {
    vi.mocked(api.fetchUnreadActivityCount).mockResolvedValue(2)
    vi.mocked(api.markActivityLogRead).mockResolvedValue('2026-01-01T00:00:00Z')
    renderHook(() => useUnreadActivityPolling(), { wrapper: wrapper('/activity') })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.markActivityLogRead).toHaveBeenCalled()
    expect(useAppStore.getState().unreadActivityCount).toBe(0)
  })

  it('refreshes the store when a poll finds unread activity, so stale screens pick up the other side\'s changes', async () => {
    useAppStore.setState({ loaded: true })
    vi.mocked(api.fetchUnreadActivityCount).mockResolvedValue(1)
    const friend = { id: 'f1', name: 'Bia', initials: 'B', color: '#fff' }
    vi.mocked(api.fetchFriends).mockResolvedValue([friend])
    vi.mocked(api.fetchExpenses).mockResolvedValue([])
    vi.mocked(api.fetchSettlements).mockResolvedValue([])
    vi.mocked(api.fetchFriendInvites).mockResolvedValue({ sent: [], received: [] })
    vi.mocked(api.fetchFriendBalance).mockResolvedValue({ friendId: 'f1', amount: 0, direction: 'even' })
    renderHook(() => useUnreadActivityPolling(), { wrapper: wrapper('/') })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.fetchFriends).toHaveBeenCalled()
    expect(useAppStore.getState().friends).toEqual([friend])
  })

  it('does not refresh the store when there is no unread activity', async () => {
    useAppStore.setState({ loaded: true })
    vi.mocked(api.fetchUnreadActivityCount).mockResolvedValue(0)
    renderHook(() => useUnreadActivityPolling(), { wrapper: wrapper('/') })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.fetchFriends).not.toHaveBeenCalled()
  })

  it('skips polling while the tab is hidden', async () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    renderHook(() => useUnreadActivityPolling(), { wrapper: wrapper('/') })

    await act(async () => {
      await Promise.resolve()
    })

    expect(api.fetchUnreadActivityCount).not.toHaveBeenCalled()
  })

  it('polls again every 30s', async () => {
    vi.mocked(api.fetchUnreadActivityCount).mockResolvedValue(0)
    renderHook(() => useUnreadActivityPolling(), { wrapper: wrapper('/') })

    await act(async () => {
      await Promise.resolve()
    })
    expect(api.fetchUnreadActivityCount).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(api.fetchUnreadActivityCount).toHaveBeenCalledTimes(2)
  })

  it('swallows errors from a failed poll', async () => {
    vi.mocked(api.fetchUnreadActivityCount).mockRejectedValue(new Error('offline'))
    renderHook(() => useUnreadActivityPolling(), { wrapper: wrapper('/') })

    await expect(
      act(async () => {
        await Promise.resolve()
      }),
    ).resolves.not.toThrow()
  })

  it('stops polling and removes listeners on unmount', async () => {
    vi.mocked(api.fetchUnreadActivityCount).mockResolvedValue(0)
    const { unmount } = renderHook(() => useUnreadActivityPolling(), { wrapper: wrapper('/') })
    await act(async () => {
      await Promise.resolve()
    })

    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(api.fetchUnreadActivityCount).toHaveBeenCalledTimes(1)
  })
})
