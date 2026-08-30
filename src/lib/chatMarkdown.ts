/**
 * Parser mínimo pro subconjunto de markdown que o assistente de IA tem
 * permissão de usar (ver systemInstruction em
 * ../../../split-uai-backend/internal/assistant/prompt.go, regra 6):
 * **negrito**, *itálico* e ~~riscado~~. De propósito não é um parser de
 * markdown genérico — qualquer outro símbolo (#, -, `, links, etc.) passa
 * direto como texto literal, o que é o comportamento certo: o prompt já
 * instrui a IA a não usar nada além desses três estilos, então não faz
 * sentido o frontend saber interpretar mais que isso.
 */
export type ChatMarkdownToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'strikethrough'; text: string }

// Ordem importa: bold (**) precisa vir antes de italic (*) na alternação,
// senão "**negrito**" seria lido como dois itálicos abertos por engano.
const PATTERN = /\*\*(.+?)\*\*|~~(.+?)~~|\*(.+?)\*/g

export function parseChatMarkdown(text: string): ChatMarkdownToken[] {
  const tokens: ChatMarkdownToken[] = []
  let lastIndex = 0

  for (const match of text.matchAll(PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, index) })
    }

    const [, bold, strikethrough, italic] = match
    if (bold !== undefined) {
      tokens.push({ type: 'bold', text: bold })
    } else if (strikethrough !== undefined) {
      tokens.push({ type: 'strikethrough', text: strikethrough })
    } else if (italic !== undefined) {
      tokens.push({ type: 'italic', text: italic })
    }

    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return tokens
}
