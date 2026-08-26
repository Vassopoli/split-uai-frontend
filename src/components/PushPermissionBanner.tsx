import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from './Button'
import { enablePush, getPushSupport } from '../lib/pushNotifications'

const DISMISSED_KEY = 'push-banner-dismissed'

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (getPushSupport() === 'unsupported') return
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (Notification.permission !== 'default') return
    setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  async function handleEnable() {
    setWorking(true)
    try {
      await enablePush()
    } catch {
      // usuário negou ou algo falhou — sem problema, ele ainda pode ativar
      // depois pelo menu, não insistimos de novo automaticamente
    } finally {
      dismiss()
    }
  }

  if (!visible) return null

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-900/40">
      <Bell size={18} className="shrink-0 text-brand-600 dark:text-brand-300" />
      <p className="flex-1 text-sm text-[#12251f] dark:text-white">
        Quer receber um aviso quando um amigo adicionar uma despesa ou registrar um pagamento?
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={handleEnable} disabled={working} type="button">
          Ativar
        </Button>
        <button
          onClick={dismiss}
          aria-label="Agora não"
          className="rounded-full p-1.5 text-[#6b6375] hover:bg-black/[0.05] dark:text-gray-400 dark:hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
