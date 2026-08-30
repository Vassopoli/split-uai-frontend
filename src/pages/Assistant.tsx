import { useEffect, useRef, useState } from 'react'
import { Bot, Send } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { useAppStore } from '../store/useAppStore'
import { sendAssistantMessage, type AssistantMessage } from '../lib/api'
import { parseChatMarkdown } from '../lib/chatMarkdown'

const SUGGESTIONS = [
  'Qual o meu saldo com cada amigo?',
  'Quanto gastei em restaurante esse mês?',
  'Quais foram minhas últimas despesas?',
]

// Mesmo limite do backend (ver maxAssistantHistoryLen em
// internal/handlers/assistant.go) — evita mandar um histórico que o backend
// só ia cortar de qualquer forma.
const MAX_HISTORY = 20

export function Assistant() {
  const friends = useAppStore((s) => s.friends)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text?: string) {
    const message = (text ?? input).trim()
    if (!message || loading) return

    setInput('')
    setError(null)
    const history = messages.slice(-MAX_HISTORY)
    setMessages((curr) => [...curr, { role: 'user', text: message }])
    setLoading(true)

    try {
      const reply = await sendAssistantMessage(message, history)
      setMessages((curr) => [...curr, { role: 'model', text: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao falar com o assistente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[70vh] min-h-[420px] flex-col gap-4">
      <div>
        <h1 className="px-1 text-lg font-semibold text-[#12251f] dark:text-white">Assistente</h1>
        <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-900/20 dark:text-brand-200">
          Esse assistente só consulta seus dados — não cria, edita nem exclui despesas ou
          pagamentos. Pra isso, use os botões normais do app.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                <Bot size={22} />
              </div>
              <p className="max-w-xs text-sm text-[#8a8593]">
                Pergunte sobre suas despesas, saldos ou pagamentos.
                {friends.length === 0 && ' Adicione um amigo pra ter dados pra consultar.'}
              </p>
              {friends.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSend(s)}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-[#4b4655] transition-colors hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
              {loading && <TypingBubble />}
              {error && <p className="text-sm text-owe-600">{error}</p>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2 border-t border-black/[0.06] p-3 dark:border-white/10"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo sobre suas despesas..."
            disabled={loading}
            className="flex-1 rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-60 dark:border-white/15 dark:text-white"
          />
          <Button type="submit" size="md" disabled={loading || !input.trim()} aria-label="Enviar mensagem">
            <Send size={16} />
          </Button>
        </form>
      </Card>
    </div>
  )
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
          isUser
            ? 'bg-brand-500 text-white'
            : 'bg-black/[0.04] text-[#12251f] dark:bg-white/10 dark:text-white'
        }`}
      >
        {parseChatMarkdown(message.text).map((token, i) => {
          switch (token.type) {
            case 'bold':
              return <strong key={i}>{token.text}</strong>
            case 'italic':
              return <em key={i}>{token.text}</em>
            case 'strikethrough':
              return <s key={i}>{token.text}</s>
            default:
              return token.text
          }
        })}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-black/[0.04] px-3.5 py-2.5 text-sm text-[#8a8593] dark:bg-white/10">
        Pensando...
      </div>
    </div>
  )
}
