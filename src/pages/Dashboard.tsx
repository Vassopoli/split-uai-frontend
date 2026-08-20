import { Link } from 'react-router-dom'
import { ArrowRight, HandCoins, UserPlus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/Card'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { describeBalance, formatBRL, overallBalance } from '../lib/balance'
import type { FriendBalance } from '../types'

export function Dashboard() {
  const friends = useAppStore((s) => s.friends)
  const balances = useAppStore((s) => s.balances)

  const total = overallBalance(Object.values(balances))

  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-start gap-1 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a8593]">
            Saldo geral
          </p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              total === 0
                ? 'text-[#12251f] dark:text-white'
                : total > 0
                  ? 'text-owed-600'
                  : 'text-owe-600'
            }`}
          >
            {total === 0
              ? 'Tudo quitado'
              : total > 0
                ? `Te devem ${formatBRL(total)}`
                : `Você deve ${formatBRL(total)}`}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
          <HandCoins size={20} />
        </div>
      </Card>

      {friends.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <UserPlus size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#12251f] dark:text-white">
              Você ainda não tem amigos por aqui
            </p>
            <p className="mt-1 text-sm text-[#8a8593]">
              Convide alguém pelo e-mail pra começar a dividir despesas.
            </p>
          </div>
          <Link to="/invites">
            <Button size="sm">
              <UserPlus size={16} /> Convidar amigo
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {friends.map((f) => {
            const balance: FriendBalance = balances[f.id] ?? { friendId: f.id, net: 0 }
            const { text, tone } = describeBalance(balance.net)
            return (
              <Link key={f.id} to={`/friends/${f.id}`}>
                <Card className="flex items-center gap-3 p-4 transition-colors hover:border-brand-300/60 dark:hover:border-brand-400/40">
                  <Avatar name={f.name} initials={f.initials} color={f.color} picture={f.picture} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#12251f] dark:text-white">
                      {f.name}
                    </p>
                    <p
                      className={`truncate text-sm ${
                        tone === 'owed'
                          ? 'text-owed-600'
                          : tone === 'owe'
                            ? 'text-owe-600'
                            : 'text-[#8a8593]'
                      }`}
                    >
                      {text}
                    </p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-[#8a8593]" />
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
