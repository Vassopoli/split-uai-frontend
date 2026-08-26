import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import {
  disconnectTelegram,
  fetchTelegramStatus,
  setTelegramChatId,
  type TelegramStatus,
} from '../lib/api'

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; data: TelegramStatus }
  | { kind: 'error'; message: string }

export function TelegramSettingsModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [chatIdInput, setChatIdInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchTelegramStatus()
      .then((data) => {
        if (!cancelled) setStatus({ kind: 'ready', data })
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Erro ao carregar status do Telegram.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    if (!chatIdInput.trim()) return
    setSaving(true)
    try {
      await setTelegramChatId(chatIdInput.trim())
      setStatus({ kind: 'ready', data: { linked: true, chatId: chatIdInput.trim() } })
      setChatIdInput('')
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Erro ao salvar o Chat ID.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    setSaving(true)
    try {
      await disconnectTelegram()
      setStatus({ kind: 'ready', data: { linked: false } })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Erro ao desconectar o Telegram.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Lembrete por Telegram" onClose={onClose}>
      <div className="space-y-4">
        {status.kind === 'loading' && (
          <div className="flex justify-center py-6">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        )}

        {status.kind === 'error' && <p className="text-sm text-owe-600">{status.message}</p>}

        {status.kind === 'ready' && status.data.linked && (
          <>
            <p className="text-sm text-[#4b4655] dark:text-gray-300">
              Telegram conectado — você recebe um lembrete todo mês se ficar devendo alguém.
            </p>
            {status.data.chatId && (
              <p className="text-xs text-[#8a8593]">Chat ID: {status.data.chatId}</p>
            )}
            <Button variant="secondary" onClick={handleDisconnect} disabled={saving} type="button">
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Desconectar'}
            </Button>
          </>
        )}

        {status.kind === 'ready' && !status.data.linked && (
          <>
            <div className="space-y-1.5 text-sm text-[#4b4655] dark:text-gray-300">
              <p>Pra receber um lembrete no Telegram quando ficar devendo:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Abra uma conversa com o bot do Split Uai no Telegram e mande qualquer mensagem.</li>
                <li>
                  Descubra seu Chat ID mandando uma mensagem pro{' '}
                  <span className="font-medium">@userinfobot</span>.
                </li>
                <li>Cole o número abaixo.</li>
              </ol>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6b6375] dark:text-gray-400">
                Chat ID
              </label>
              <input
                inputMode="numeric"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder="Ex: 123456789"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
              />
            </div>
            <Button onClick={handleSave} disabled={saving || !chatIdInput.trim()} type="button">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Salvar
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
