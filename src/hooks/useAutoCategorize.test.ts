import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import { useAutoCategorize } from './useAutoCategorize'

vi.mock('../lib/api')

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutoCategorize', () => {
  it('debounces and calls onCategorized after the description settles', async () => {
    vi.mocked(api.categorizeExpense).mockResolvedValue({
      status: 'ok',
      data: { category: 'food', confidence: 'high' },
    })
    const onCategorized = vi.fn()
    const { rerender } = renderHook(
      ({ description }) => useAutoCategorize({ description, enabled: true, onCategorized }),
      { initialProps: { description: '' } },
    )

    rerender({ description: 'lanche no bk' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(api.categorizeExpense).toHaveBeenCalledWith('lanche no bk')
    expect(onCategorized).toHaveBeenCalledWith('food', 'high')
  })

  it('does nothing while disabled', async () => {
    const onCategorized = vi.fn()
    const { rerender } = renderHook(
      ({ description }) => useAutoCategorize({ description, enabled: false, onCategorized }),
      { initialProps: { description: '' } },
    )

    rerender({ description: 'lanche' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(api.categorizeExpense).not.toHaveBeenCalled()
  })

  it('does not re-fire for the same text it already sent', async () => {
    vi.mocked(api.categorizeExpense).mockResolvedValue({
      status: 'ok',
      data: { category: 'food', confidence: 'high' },
    })
    const onCategorized = vi.fn()
    const { rerender } = renderHook(
      ({ description }) => useAutoCategorize({ description, enabled: true, onCategorized }),
      { initialProps: { description: 'lanche' } },
    )

    rerender({ description: 'lanche ' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(api.categorizeExpense).not.toHaveBeenCalled()
  })

  it('handleBlur fires immediately, bypassing the debounce', async () => {
    vi.mocked(api.categorizeExpense).mockResolvedValue({
      status: 'ok',
      data: { category: 'transport', confidence: 'low' },
    })
    const onCategorized = vi.fn()
    const { result, rerender } = renderHook(
      ({ description }) => useAutoCategorize({ description, enabled: true, onCategorized }),
      { initialProps: { description: '' } },
    )

    rerender({ description: 'uber' })
    await act(async () => {
      result.current.handleBlur()
      await Promise.resolve()
    })

    expect(api.categorizeExpense).toHaveBeenCalledWith('uber')
    expect(onCategorized).toHaveBeenCalledWith('transport', 'low')
  })

  it('blocks further calls until the rate-limit window passes', async () => {
    vi.mocked(api.categorizeExpense).mockResolvedValueOnce({
      status: 'rate_limited',
      retryAfterSeconds: 30,
    })
    const onCategorized = vi.fn()
    const { result, rerender } = renderHook(
      ({ description }) => useAutoCategorize({ description, enabled: true, onCategorized }),
      { initialProps: { description: '' } },
    )

    rerender({ description: 'uber' })
    await act(async () => {
      result.current.handleBlur()
      await Promise.resolve()
    })
    expect(onCategorized).not.toHaveBeenCalled()

    rerender({ description: 'uber eats' })
    await act(async () => {
      result.current.handleBlur()
      await Promise.resolve()
    })
    expect(api.categorizeExpense).toHaveBeenCalledTimes(1)
  })

  it('swallows errors from categorizeExpense', async () => {
    vi.mocked(api.categorizeExpense).mockRejectedValue(new Error('network down'))
    const onCategorized = vi.fn()
    const { result, rerender } = renderHook(
      ({ description }) => useAutoCategorize({ description, enabled: true, onCategorized }),
      { initialProps: { description: '' } },
    )

    rerender({ description: 'uber' })
    await act(async () => {
      result.current.handleBlur()
      await Promise.resolve()
    })

    expect(onCategorized).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
