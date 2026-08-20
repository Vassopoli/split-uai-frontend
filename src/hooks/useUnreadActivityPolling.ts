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
 */
export function useUnreadActivityPolling() {
  const { pathname } = useLocation()
  const onActivityPageRef = useRef(pathname === '/activity')
  onActivityPageRef.current = pathname === '/activity'

  const setUnreadActivityCount = useAppStore((s) => s.setUnreadActivityCount)
  const markActivityRead = useAppStore((s) => s.markActivityRead)

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
  }, [setUnreadActivityCount, markActivityRead])
}
