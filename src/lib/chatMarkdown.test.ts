import { describe, expect, it } from 'vitest'
import { parseChatMarkdown } from './chatMarkdown'

describe('parseChatMarkdown', () => {
  it('returns plain text as a single text token', () => {
    expect(parseChatMarkdown('sem formatação aqui')).toEqual([
      { type: 'text', text: 'sem formatação aqui' },
    ])
  })

  it('parses bold', () => {
    expect(parseChatMarkdown('você deve **R$ 50,00**')).toEqual([
      { type: 'text', text: 'você deve ' },
      { type: 'bold', text: 'R$ 50,00' },
    ])
  })

  it('parses italic', () => {
    expect(parseChatMarkdown('pago por *Fulano*')).toEqual([
      { type: 'text', text: 'pago por ' },
      { type: 'italic', text: 'Fulano' },
    ])
  })

  it('parses strikethrough', () => {
    expect(parseChatMarkdown('~~quitado~~ ainda em aberto')).toEqual([
      { type: 'strikethrough', text: 'quitado' },
      { type: 'text', text: ' ainda em aberto' },
    ])
  })

  it('does not read a bold marker as two nested italics', () => {
    expect(parseChatMarkdown('**negrito**')).toEqual([{ type: 'bold', text: 'negrito' }])
  })

  it('mixes multiple styles in one message', () => {
    expect(parseChatMarkdown('**Bia** te deve *R$ 10,00*, ~~já quitado~~')).toEqual([
      { type: 'bold', text: 'Bia' },
      { type: 'text', text: ' te deve ' },
      { type: 'italic', text: 'R$ 10,00' },
      { type: 'text', text: ', ' },
      { type: 'strikethrough', text: 'já quitado' },
    ])
  })

  it('leaves unsupported markdown symbols as literal text', () => {
    expect(parseChatMarkdown('# Título\n- item 1\n- item 2')).toEqual([
      { type: 'text', text: '# Título\n- item 1\n- item 2' },
    ])
  })

  it('returns an empty array for an empty string', () => {
    expect(parseChatMarkdown('')).toEqual([])
  })
})
