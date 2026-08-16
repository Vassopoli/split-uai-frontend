import { useState, type FormEvent } from 'react'
import { Check, UserPlus, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'

export function Invites() {
  const invites = useAppStore((s) => s.invites)
  const inviteFriend = useAppStore((s) => s.inviteFriend)
  const acceptInvite = useAppStore((s) => s.acceptInvite)
  const declineInvite = useAppStore((s) => s.declineInvite)

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(
    null,
  )
  const [actingId, setActingId] = useState<string | null>(null)

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setFeedback(null)
    try {
      const result = await inviteFriend(trimmed)
      if (result.status === 'accepted' && result.friend) {
        setFeedback({
          kind: 'ok',
          text: `${result.friend.name.split(' ')[0]} já tinha te convidado — vocês já são amigos agora.`,
        })
      } else {
        setFeedback({ kind: 'ok', text: 'Convite enviado! Assim que aceitar, já dá pra dividir despesas.' })
      }
      setEmail('')
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Erro ao enviar convite.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAccept(id: string) {
    setActingId(id)
    try {
      await acceptInvite(id)
    } finally {
      setActingId(null)
    }
  }

  async function handleDecline(id: string) {
    setActingId(id)
    try {
      await declineInvite(id)
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <UserPlus size={16} className="text-brand-600 dark:text-brand-300" />
          <h2 className="text-sm font-semibold text-[#12251f] dark:text-white">
            Adicionar amigo
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#8a8593]">
          Convide pelo e-mail que a pessoa usa pra entrar no app.
        </p>
        <form onSubmit={handleInvite} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="amigo@exemplo.com"
            className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#12251f] outline-none focus:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
          <Button type="submit" disabled={submitting || !email.trim()}>
            {submitting ? 'Enviando...' : 'Convidar'}
          </Button>
        </form>
        {feedback && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-xs ${
              feedback.kind === 'error'
                ? 'bg-owe-50 text-owe-600'
                : 'bg-owed-50 text-owed-600'
            }`}
          >
            {feedback.text}
          </p>
        )}
      </Card>

      {invites.received.length > 0 && (
        <div>
          <h2 className="mb-2 px-1 text-sm font-semibold text-[#12251f] dark:text-white">
            Convites recebidos
          </h2>
          <Card className="divide-y divide-black/[0.05] overflow-hidden dark:divide-white/[0.06]">
            {invites.received.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <Avatar
                  name={invite.name}
                  initials={invite.initials}
                  color={invite.color}
                  picture={invite.picture}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#12251f] dark:text-white">
                    {invite.name}
                  </p>
                  <p className="truncate text-xs text-[#8a8593]">{invite.email}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actingId === invite.id}
                    onClick={() => handleDecline(invite.id)}
                  >
                    <X size={14} />
                  </Button>
                  <Button
                    size="sm"
                    disabled={actingId === invite.id}
                    onClick={() => handleAccept(invite.id)}
                  >
                    <Check size={14} /> Aceitar
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {invites.sent.length > 0 && (
        <div>
          <h2 className="mb-2 px-1 text-sm font-semibold text-[#12251f] dark:text-white">
            Convites enviados
          </h2>
          <Card className="divide-y divide-black/[0.05] overflow-hidden dark:divide-white/[0.06]">
            {invites.sent.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <Avatar
                  name={invite.name}
                  initials={invite.initials}
                  color={invite.color}
                  picture={invite.picture}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#12251f] dark:text-white">
                    {invite.name}
                  </p>
                  <p className="truncate text-xs text-[#8a8593]">{invite.email}</p>
                </div>
                <span className="shrink-0 text-xs text-[#8a8593]">Aguardando resposta</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {invites.received.length === 0 && invites.sent.length === 0 && (
        <p className="text-center text-sm text-[#8a8593]">Nenhum convite pendente.</p>
      )}
    </div>
  )
}
