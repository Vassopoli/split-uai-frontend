import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { disablePush, enablePush, fetchPushState, getPushSupport } from '../lib/pushNotifications'

type Status =
  | { kind: 'loading' }
  | { kind: 'unsupported' }
  | { kind: 'ready'; subscribed: boolean; permission: NotificationPermission }
  | { kind: 'error'; message: string }

export function PushSettingsModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [working, setWorking] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (getPushSupport() === 'unsupported') {
      setStatus({ kind: 'unsupported' })
      return
    }
    fetchPushState()
      .then(({ subscribed, permission }) => {
        if (!cancelled) setStatus({ kind: 'ready', subscribed, permission })
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Erro ao carregar status das notificações.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleEnable() {
    setWorking(true)
    try {
      await enablePush()
      setStatus({ kind: 'ready', subscribed: true, permission: 'granted' })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Erro ao ativar notificações.',
      })
    } finally {
      setWorking(false)
    }
  }

  async function handleDisable() {
    setWorking(true)
    try {
      await disablePush()
      setStatus({ kind: 'ready', subscribed: false, permission: Notification.permission })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Erro ao desativar notificações.',
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <Modal title="Notificações push" onClose={onClose}>
      <div className="space-y-4">
        {status.kind === 'loading' && (
          <div className="flex justify-center py-6">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        )}

        {status.kind === 'unsupported' && (
          <p className="text-sm text-[#4b4655] dark:text-gray-300">
            Este navegador não suporta notificações push.
          </p>
        )}

        {status.kind === 'error' && <p className="text-sm text-owe-600">{status.message}</p>}

        {status.kind === 'ready' && status.permission === 'denied' && (
          <p className="text-sm text-[#4b4655] dark:text-gray-300">
            Você bloqueou notificações pra este site. Pra ativar, libere nas configurações do
            navegador e volte aqui.
          </p>
        )}

        {status.kind === 'ready' && status.permission !== 'denied' && status.subscribed && (
          <>
            <p className="text-sm text-[#4b4655] dark:text-gray-300">
              Notificações ativadas — você recebe um aviso quando um amigo adiciona uma despesa,
              registra um pagamento ou quando ficar devendo há tempo demais.
            </p>
            <Button variant="secondary" onClick={handleDisable} disabled={working} type="button">
              {working ? <Loader2 size={16} className="animate-spin" /> : 'Desativar'}
            </Button>
          </>
        )}

        {status.kind === 'ready' && status.permission !== 'denied' && !status.subscribed && (
          <>
            <p className="text-sm text-[#4b4655] dark:text-gray-300">
              Receba um aviso neste navegador quando um amigo adicionar uma despesa, registrar um
              pagamento, ou quando você ficar devendo há tempo demais.
            </p>
            <Button onClick={handleEnable} disabled={working} type="button">
              {working ? <Loader2 size={16} className="animate-spin" /> : 'Ativar'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
