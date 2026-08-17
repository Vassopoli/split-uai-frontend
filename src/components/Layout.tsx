import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Camera, Plus, UserPlus, Wallet } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { UserMenu } from './UserMenu'
import { describeBalance } from '../lib/balance'
import type { LayoutContext } from '../pages/layoutContext'

export function Layout({ openAddExpense, openScanReceipt }: LayoutContext) {
  const friends = useAppStore((s) => s.friends)
  const balances = useAppStore((s) => s.balances)
  const receivedInvites = useAppStore((s) => s.invites.received.length)

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-5">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Wallet size={18} strokeWidth={2.2} />
          </div>
          <span className="hidden text-lg font-semibold tracking-tight text-[#12251f] dark:text-white sm:inline">
            Split Uai
          </span>
        </NavLink>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={openScanReceipt} title="Escanear nota fiscal">
            <Camera size={16} />
            <span className="sm:hidden">Escanear</span>
            <span className="hidden sm:inline">Escanear nota</span>
          </Button>
          <Button size="sm" onClick={() => openAddExpense()}>
            <Plus size={16} />
            <span className="sm:hidden">Despesa</span>
            <span className="hidden sm:inline">Nova despesa</span>
          </Button>
          <UserMenu />
        </div>
      </header>

      <nav className="flex items-center gap-1 border-b border-black/[0.06] dark:border-white/10">
        <TabLink to="/" label="Visão geral" />
        {friends.map((f) => {
          const balance = balances[f.id] ?? { friendId: f.id, net: 0 }
          const { tone } = describeBalance(balance.net, f.name.split(' ')[0])
          return (
            <TabLink key={f.id} to={`/friends/${f.id}`}>
              {(isActive) => (
                <span className="flex items-center gap-1.5">
                  <Avatar name={f.name} initials={f.initials} color={f.color} picture={f.picture} size="sm" />
                  {isActive && f.name.split(' ')[0]}
                  {tone !== 'settled' && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        tone === 'owed' ? 'bg-owed-500' : 'bg-owe-500'
                      }`}
                    />
                  )}
                </span>
              )}
            </TabLink>
          )
        })}
        <TabLink to="/invites">
          <span className="flex items-center gap-1.5">
            <UserPlus size={15} />
            Convites
            {receivedInvites > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-owe-500 px-1 text-[10px] font-semibold text-white">
                {receivedInvites}
              </span>
            )}
          </span>
        </TabLink>
      </nav>

      <main className="flex-1 py-6">
        <Outlet context={{ openAddExpense, openScanReceipt } satisfies LayoutContext} />
      </main>

      <footer className="py-6 text-center text-xs text-[#8a8593]">
        Split Uai — divisão de despesas entre amigos.
      </footer>
    </div>
  )
}

function TabLink({
  to,
  label,
  children,
}: {
  to: string
  label?: string
  children?: ReactNode | ((isActive: boolean) => ReactNode)
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `relative px-3 py-3 text-sm font-medium transition-colors ${
          isActive
            ? 'text-brand-600 dark:text-brand-300'
            : 'text-[#6b6375] hover:text-[#12251f] dark:text-gray-400 dark:hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {typeof children === 'function' ? children(isActive) : (children ?? label)}
          {isActive && (
            <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500" />
          )}
        </>
      )}
    </NavLink>
  )
}
