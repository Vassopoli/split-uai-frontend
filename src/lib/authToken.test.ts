import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken, setTokenGetter } from './authToken'

describe('authToken', () => {
  afterEach(() => {
    setTokenGetter(null)
  })

  it('throws when no getter has been registered', async () => {
    await expect(getAccessToken()).rejects.toThrow('Sessão expirada. Faça login novamente.')
  })

  it('delegates to the registered getter', async () => {
    const getter = vi.fn().mockResolvedValue('abc123')
    setTokenGetter(getter)
    await expect(getAccessToken()).resolves.toBe('abc123')
    expect(getter).toHaveBeenCalledTimes(1)
  })

  it('clearing the getter with null goes back to throwing', async () => {
    setTokenGetter(vi.fn().mockResolvedValue('abc123'))
    setTokenGetter(null)
    await expect(getAccessToken()).rejects.toThrow('Sessão expirada. Faça login novamente.')
  })
})
