import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as authToken from './authToken'
import {
  categorizeExpense,
  createExpense,
  deleteExpense,
  disconnectTelegram,
  fetchFriends,
  fetchPushStatus,
  fetchTelegramStatus,
  registerPayment,
  scanReceipt,
  setTelegramChatId,
  settleUp,
  subscribePush,
  unsubscribePush,
} from './api'

function jsonResponse(body: unknown, init: Partial<{ status: number; headers: Record<string, string> }> = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

describe('lib/api', () => {
  beforeEach(() => {
    vi.spyOn(authToken, 'getAccessToken').mockResolvedValue('token-123')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('attaches a bearer token to every request', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    await fetchFriends()
    const [, options] = vi.mocked(fetch).mock.calls[0]
    expect((options!.headers as Record<string, string>).Authorization).toBe('Bearer token-123')
  })

  it('adds a JSON content-type header only when there is a body', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 'e1' }))
    await createExpense({
      friendId: 'f1',
      description: 'x',
      category: 'other',
      amount: 10,
      paidBy: 'me',
      splitType: 'equal',
      myShare: 5,
      friendShare: 5,
      date: '2026-01-01',
    })
    const [, options] = vi.mocked(fetch).mock.calls[0]
    expect((options!.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('parses a successful JSON response', async () => {
    const friends = [{ id: 'f1', name: 'Bia', initials: 'B', color: '#fff' }]
    vi.mocked(fetch).mockResolvedValue(jsonResponse(friends))
    await expect(fetchFriends()).resolves.toEqual(friends)
  })

  it('returns undefined on a 204 No Content', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    await expect(deleteExpense('e1')).resolves.toBeUndefined()
  })

  it('throws the API error message when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { message: 'Despesa não encontrada' } }, { status: 404 }),
    )
    await expect(deleteExpense('missing')).rejects.toThrow('Despesa não encontrada')
  })

  it('falls back to a generic error message when the error body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('oops', { status: 500 }))
    await expect(deleteExpense('e1')).rejects.toThrow('Erro 500 ao chamar a API.')
  })

  describe('scanReceipt', () => {
    it('returns unreadable on 422', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 422 }))
      await expect(scanReceipt(new Blob())).resolves.toEqual({ status: 'unreadable' })
    })

    it('returns rate_limited with retry-after on 429', async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse(
          { error: { message: 'espera um pouco' } },
          { status: 429, headers: { 'Retry-After': '120' } },
        ),
      )
      const result = await scanReceipt(new Blob())
      expect(result).toEqual({
        status: 'rate_limited',
        retryAfterSeconds: 120,
        message: 'espera um pouco',
      })
    })

    it('defaults retryAfterSeconds to 600 when the header is missing', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('not json', { status: 429 }))
      const result = await scanReceipt(new Blob())
      expect(result.status).toBe('rate_limited')
      if (result.status === 'rate_limited') expect(result.retryAfterSeconds).toBe(600)
    })

    it('returns ok with the scan data on success', async () => {
      const data = { merchantName: 'X', total: 10 }
      vi.mocked(fetch).mockResolvedValue(jsonResponse(data))
      await expect(scanReceipt(new Blob())).resolves.toEqual({ status: 'ok', data })
    })

    it('throws on other error statuses', async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ error: { message: 'falha geral' } }, { status: 500 }),
      )
      await expect(scanReceipt(new Blob())).rejects.toThrow('falha geral')
    })
  })

  describe('settleUp', () => {
    it('returns the settlement result as-is when the backend returns one', async () => {
      const body = { settlement: { id: 's1' }, settledExpenseIds: ['e1'] }
      vi.mocked(fetch).mockResolvedValue(jsonResponse(body))
      await expect(settleUp('f1')).resolves.toEqual(body)
    })

    it('falls back to an empty result on a 204/null body', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
      await expect(settleUp('f1')).resolves.toEqual({ settlement: null, settledExpenseIds: [] })
    })
  })

  describe('registerPayment', () => {
    it('posts to the partial-settle endpoint and returns the settlement', async () => {
      const settlement = { id: 's1', amount: 30 }
      vi.mocked(fetch).mockResolvedValue(jsonResponse(settlement))
      await expect(
        registerPayment('f1', { amount: 30, date: '2026-01-01' }),
      ).resolves.toEqual(settlement)
      const [url] = vi.mocked(fetch).mock.calls[0]
      expect(url).toContain('/friends/f1/settle/partial')
    })
  })

  describe('telegram', () => {
    it('fetches the linked status', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ linked: true, chatId: '123' }))
      await expect(fetchTelegramStatus()).resolves.toEqual({ linked: true, chatId: '123' })
    })

    it('sets the chat id', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
      await expect(setTelegramChatId('123')).resolves.toBeUndefined()
    })

    it('disconnects telegram', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
      await expect(disconnectTelegram()).resolves.toBeUndefined()
    })
  })

  describe('push subscriptions', () => {
    it('fetches push status', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ subscribed: true }))
      await expect(fetchPushStatus()).resolves.toEqual({ subscribed: true })
    })

    it('subscribes with the given PushSubscriptionJSON', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
      await subscribePush({ endpoint: 'https://push.example/abc' })
      const [, options] = vi.mocked(fetch).mock.calls[0]
      expect(JSON.parse(options?.body as string)).toEqual({ endpoint: 'https://push.example/abc' })
    })

    it('unsubscribes by endpoint', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
      await unsubscribePush('https://push.example/abc')
      const [, options] = vi.mocked(fetch).mock.calls[0]
      expect(JSON.parse(options?.body as string)).toEqual({ endpoint: 'https://push.example/abc' })
    })
  })

  describe('categorizeExpense', () => {
    it('returns rate_limited on 429', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(null, { status: 429, headers: { 'Retry-After': '10' } }),
      )
      await expect(categorizeExpense('uber')).resolves.toEqual({
        status: 'rate_limited',
        retryAfterSeconds: 10,
      })
    })

    it('returns error on any other failure', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }))
      await expect(categorizeExpense('uber')).resolves.toEqual({ status: 'error' })
    })

    it('returns ok with the categorization on success', async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ category: 'food', confidence: 'high' }))
      await expect(categorizeExpense('lanche')).resolves.toEqual({
        status: 'ok',
        data: { category: 'food', confidence: 'high' },
      })
    })
  })
})
