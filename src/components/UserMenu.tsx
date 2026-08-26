import { useEffect, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { LogOut, Send } from 'lucide-react'
import { Avatar } from './Avatar'
import { TelegramSettingsModal } from './TelegramSettingsModal'

export function UserMenu() {
  const { user, logout } = useAuth0()
  const [open, setOpen] = useState(false)
  const [telegramModalOpen, setTelegramModalOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (!user) return null

  const name = user.name ?? user.email ?? 'Você'
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative" ref={rootRef}>
      <button onClick={() => setOpen((v) => !v)} className="block rounded-full">
        <Avatar name={name} initials={initials} color="#12876c" picture={user.picture} size="md" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-black/[0.06] bg-white py-1.5 shadow-lg dark:border-white/10 dark:bg-[#161b18]">
          <div className="border-b border-black/[0.06] px-3 py-2 dark:border-white/10">
            <p className="truncate text-sm font-medium text-[#12251f] dark:text-white">
              {name}
            </p>
            {user.email && (
              <p className="truncate text-xs text-[#8a8593]">{user.email}</p>
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false)
              setTelegramModalOpen(true)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#4b4655] hover:bg-black/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            <Send size={15} /> Lembrete por Telegram
          </button>
          <button
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#4b4655] hover:bg-black/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      )}

      {telegramModalOpen && (
        <TelegramSettingsModal onClose={() => setTelegramModalOpen(false)} />
      )}
    </div>
  )
}
