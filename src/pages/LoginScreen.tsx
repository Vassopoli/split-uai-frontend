import { useAuth0 } from '@auth0/auth0-react'
import { Wallet } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

export function LoginScreen() {
  const { loginWithRedirect, error } = useAuth0()

  // `prompt: 'login'` ignores any existing Auth0 SSO session and forces a
  // fresh authentication, so a denied login doesn't get silently re-applied.
  const signup = () =>
    loginWithRedirect({
      authorizationParams: { screen_hint: 'signup', prompt: 'login' },
    })
  const login = () => loginWithRedirect({ authorizationParams: { prompt: 'login' } })

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Wallet size={22} strokeWidth={2.2} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-[#12251f] dark:text-white">
          Split Uai
        </h1>
        <p className="mt-1 text-sm text-[#6b6375] dark:text-gray-400">
          Entre para ver e dividir suas despesas.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-owe-50 px-3 py-2 text-xs text-owe-600">
            {error.message}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={login}>Entrar</Button>
          <Button variant="secondary" onClick={signup}>
            Criar conta
          </Button>
        </div>
      </Card>
    </div>
  )
}
