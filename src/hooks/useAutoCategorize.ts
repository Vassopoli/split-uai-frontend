import { useEffect, useRef, useState } from 'react'
import { categorizeExpense, type CategorizeConfidence } from '../lib/api'
import type { Expense } from '../types'

const DEBOUNCE_MS = 1000
const MIN_INTERVAL_MS = 10_000

interface UseAutoCategorizeOptions {
  description: string
  enabled: boolean
  onCategorized: (category: Expense['category'], confidence: CategorizeConfidence) => void
}

/**
 * Suggests a category from the description text: debounced while typing,
 * fired immediately on blur (never per keystroke — the backend allows only
 * one call every 10s per user). Failures (400/429/503) are swallowed here;
 * it's a convenience, never a blocking step of the expense form.
 */
export function useAutoCategorize({ description, enabled, onCategorized }: UseAutoCategorizeOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastCallAtRef = useRef(0)
  const blockedUntilRef = useRef(0)
  // Seeded with the initial text (pre-filled when editing an existing
  // expense, or from a receipt-scan draft) so a mount run — including the
  // double-invoke React does in StrictMode — never fires for text the user
  // hasn't actually changed yet.
  const lastSentRef = useRef(description.trim())
  const mountedRef = useRef(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  function run(text: string) {
    const trimmed = text.trim()
    if (!enabled || !trimmed || trimmed === lastSentRef.current) return

    const now = Date.now()
    if (now < blockedUntilRef.current) return
    if (now - lastCallAtRef.current < MIN_INTERVAL_MS) return

    lastSentRef.current = trimmed
    lastCallAtRef.current = now
    setIsLoading(true)

    categorizeExpense(trimmed)
      .then((outcome) => {
        if (!mountedRef.current) return
        if (outcome.status === 'ok') {
          onCategorized(outcome.data.category, outcome.data.confidence)
        } else if (outcome.status === 'rate_limited') {
          blockedUntilRef.current = Date.now() + outcome.retryAfterSeconds * 1000
        }
      })
      .catch(() => {
        // Convenience feature — never surface this to the user.
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false)
      })
  }

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!enabled || !description.trim()) return undefined
    timerRef.current = setTimeout(() => run(description), DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, enabled])

  function handleBlur() {
    clearTimeout(timerRef.current)
    run(description)
  }

  return { handleBlur, isLoading }
}
