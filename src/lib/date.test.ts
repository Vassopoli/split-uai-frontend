import { describe, expect, it, vi } from 'vitest'
import { parseLocalDate, todayLocalISODate } from './date'

describe('parseLocalDate', () => {
  it('builds a Date from local calendar fields, not UTC', () => {
    const date = parseLocalDate('2026-03-05')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(2)
    expect(date.getDate()).toBe(5)
  })

  it('does not roll back a day in a negative-offset timezone the way new Date(string) would', () => {
    const date = parseLocalDate('2026-01-01')
    expect(date.getDate()).toBe(1)
    expect(date.getMonth()).toBe(0)
  })
})

describe('todayLocalISODate', () => {
  it('formats the current local date as YYYY-MM-DD', () => {
    vi.setSystemTime(new Date(2026, 7, 9, 23, 30))
    expect(todayLocalISODate()).toBe('2026-08-09')
    vi.useRealTimers()
  })

  it('zero-pads single-digit month and day', () => {
    vi.setSystemTime(new Date(2026, 0, 5))
    expect(todayLocalISODate()).toBe('2026-01-05')
    vi.useRealTimers()
  })
})
