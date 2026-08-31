import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchUnreadActivityCount } from '../lib/api'
import { useAppStore } from '../store/useAppStore'

const POLL_INTERVAL_MS = 30_000

/**
 * Polls GET /activity-log/unread-count every ~30s while the tab is visible.
 * If the user is parked on /activity when a poll comes back with count > 0
 * (someone else just logged something), it marks the feed read right away
 * instead of surfacing the badge — otherwise it'd flash back on when the
 * user leaves and returns to the tab.
 *
 * A count > 0 also means the other side changed something we don't have
 * yet (a new expense, a payment they registered...), so it triggers a
 * background refresh of the whole store — otherwise balances/expenses only
 * ever reflect actions taken locally, and screens like the dashboard stay
 * stale until a full reload (not possible from an iOS home-screen PWA).
 */
export function useUnreadActivityPolling() {
  const { pathname } = useLocation()
  const onActivityPageRef = useRef(pathname === '/activity')
  onActivityPageRef.current = pathname === '/activity'

  const setUnreadActivityCount = useAppStore((s) => s.setUnreadActivityCount)
  const markActivityRead = useAppStore((s) => s.markActivityRead)
  const refresh = useAppStore((s) => s.refresh)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      if (document.hidden) return
      try {
        const count = await fetchUnreadActivityCount()
        if (cancelled) return
        if (onActivityPageRef.current && count > 0) {
          await markActivityRead()
        } else {
          setUnreadActivityCount(count)
        }
        if (count > 0) await refresh()
      } catch {
        // best-effort — falha num poll não deve derrubar o app, tenta de novo no próximo tick
      }
    }

    poll()
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS)

    function handleVisibilityChange() {
      if (!document.hidden) poll()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [setUnreadActivityCount, markActivityRead, refresh])
}
