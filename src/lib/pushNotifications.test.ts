import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import {
  disablePush,
  enablePush,
  fetchPushState,
  getPushSupport,
  isPushSubscribed,
} from './pushNotifications'

vi.mock('./api')

function stubServiceWorker(registration: unknown) {
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    serviceWorker: { register: vi.fn().mockResolvedValue(registration) },
  })
}

describe('getPushSupport', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is "supported" when serviceWorker and PushManager exist', () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator, serviceWorker: {} })
    vi.stubGlobal('window', { ...globalThis.window, PushManager: class {} })
    expect(getPushSupport()).toBe('supported')
  })

  it('is "unsupported" when either is missing', () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator })
    expect(getPushSupport()).toBe('unsupported')
  })
})

describe('isPushSubscribed / fetchPushState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', { ...globalThis.window, PushManager: class {} })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('isPushSubscribed is false when push is unsupported', async () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator })
    await expect(isPushSubscribed()).resolves.toBe(false)
  })

  it('isPushSubscribed reflects whether the registration has a subscription', async () => {
    stubServiceWorker({ pushManager: { getSubscription: vi.fn().mockResolvedValue({}) } })
    await expect(isPushSubscribed()).resolves.toBe(true)
  })

  it('fetchPushState reports denied permission without checking anything else', async () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator })
    vi.stubGlobal('Notification', { permission: 'denied' })
    const state = await fetchPushState()
    expect(state).toEqual({ subscribed: false, permission: 'denied' })
  })

  it('fetchPushState combines local subscription and remote status when granted', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' })
    stubServiceWorker({ pushManager: { getSubscription: vi.fn().mockResolvedValue({}) } })
    vi.mocked(api.fetchPushStatus).mockResolvedValue({ subscribed: true })

    const state = await fetchPushState()
    expect(state).toEqual({ subscribed: true, permission: 'granted' })
  })

  it('fetchPushState is unsubscribed when the remote check fails', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' })
    stubServiceWorker({ pushManager: { getSubscription: vi.fn().mockResolvedValue({}) } })
    vi.mocked(api.fetchPushStatus).mockRejectedValue(new Error('offline'))

    await expect(fetchPushState()).resolves.toEqual({ subscribed: false, permission: 'granted' })
  })
})

describe('enablePush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'QUJD')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('throws when no VAPID key is configured', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    await expect(enablePush()).rejects.toThrow('Notificações push não estão configuradas')
  })

  it('throws when permission is denied', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('denied') })
    await expect(enablePush()).rejects.toThrow('Permissão de notificação negada.')
  })

  it('subscribes and sends the subscription to the backend when granted', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') })
    const subscription = { toJSON: () => ({ endpoint: 'https://push.example/abc' }) }
    stubServiceWorker({
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(subscription),
      },
    })

    await enablePush()
    expect(api.subscribePush).toHaveBeenCalledWith({ endpoint: 'https://push.example/abc' })
  })

  it('reuses an existing subscription instead of creating a new one', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') })
    const subscribe = vi.fn()
    const subscription = { toJSON: () => ({ endpoint: 'existing' }) }
    stubServiceWorker({
      pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription), subscribe },
    })

    await enablePush()
    expect(subscribe).not.toHaveBeenCalled()
    expect(api.subscribePush).toHaveBeenCalledWith({ endpoint: 'existing' })
  })
})

describe('disablePush', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('does nothing when push is unsupported', async () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator })
    await disablePush()
    expect(api.unsubscribePush).not.toHaveBeenCalled()
  })

  it('does nothing when there is no active subscription', async () => {
    vi.stubGlobal('window', { ...globalThis.window, PushManager: class {} })
    stubServiceWorker({ pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } })
    await disablePush()
    expect(api.unsubscribePush).not.toHaveBeenCalled()
  })

  it('unsubscribes locally and remotely when a subscription exists', async () => {
    vi.stubGlobal('window', { ...globalThis.window, PushManager: class {} })
    const unsubscribe = vi.fn().mockResolvedValue(undefined)
    stubServiceWorker({
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/abc', unsubscribe }),
      },
    })

    await disablePush()
    expect(api.unsubscribePush).toHaveBeenCalledWith('https://push.example/abc')
    expect(unsubscribe).toHaveBeenCalled()
  })
})
