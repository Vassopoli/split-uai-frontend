/**
 * Bridge between Auth0's React hooks (which only work inside components) and
 * the plain async functions in lib/api.ts. App.tsx registers the current
 * `getAccessTokenSilently` here whenever auth state changes; api.ts reads it
 * to attach a Bearer token to every request.
 */

type TokenGetter = () => Promise<string>

let currentGetter: TokenGetter | null = null

export function setTokenGetter(getter: TokenGetter | null): void {
  currentGetter = getter
}

export async function getAccessToken(): Promise<string> {
  if (!currentGetter) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  return currentGetter()
}
