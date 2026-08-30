import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Assistant } from './Assistant'
import { useAppStore } from '../store/useAppStore'
import * as api from '../lib/api'
import type { Friend } from '../types'

vi.mock('../lib/api')

const friend: Friend = { id: 'f1', name: 'Bia Souza', initials: 'BS', color: '#f59e0b' }

afterEach(() => {
  useAppStore.setState({ friends: [] })
})

describe('Assistant', () => {
  it('sends a message and renders the reply', async () => {
    useAppStore.setState({ friends: [friend] })
    vi.mocked(api.sendAssistantMessage).mockResolvedValue('Você deve R$ 10,00 pra Bia.')

    const user = userEvent.setup()
    render(<Assistant />)

    await user.type(
      screen.getByPlaceholderText('Pergunte algo sobre suas despesas...'),
      'quanto eu devo?{enter}',
    )

    expect(await screen.findByText('quanto eu devo?')).toBeInTheDocument()
    expect(await screen.findByText('Você deve R$ 10,00 pra Bia.')).toBeInTheDocument()
    expect(api.sendAssistantMessage).toHaveBeenCalledWith('quanto eu devo?', [])
  })

  it('renders the permitted markdown styles instead of raw symbols', async () => {
    vi.mocked(api.sendAssistantMessage).mockResolvedValue('Você deve **R$ 10,00** pra *Bia*, ~~já pago~~.')

    const user = userEvent.setup()
    render(<Assistant />)

    await user.type(
      screen.getByPlaceholderText('Pergunte algo sobre suas despesas...'),
      'oi{enter}',
    )

    expect(await screen.findByText('R$ 10,00')).toBeInTheDocument()
    expect(screen.getByText('R$ 10,00').tagName).toBe('STRONG')
    expect(screen.getByText('Bia').tagName).toBe('EM')
    expect(screen.getByText('já pago').tagName).toBe('S')
  })

  it('shows a loading bubble while waiting for the reply', async () => {
    let resolveReply!: (value: string) => void
    vi.mocked(api.sendAssistantMessage).mockReturnValue(
      new Promise((resolve) => {
        resolveReply = resolve
      }),
    )

    const user = userEvent.setup()
    render(<Assistant />)

    await user.type(
      screen.getByPlaceholderText('Pergunte algo sobre suas despesas...'),
      'oi{enter}',
    )

    expect(await screen.findByText('Pensando...')).toBeInTheDocument()
    resolveReply('Oi! Como posso ajudar?')
    expect(await screen.findByText('Oi! Como posso ajudar?')).toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    vi.mocked(api.sendAssistantMessage).mockRejectedValue(new Error('aguarde 5s antes de mandar outra mensagem'))

    const user = userEvent.setup()
    render(<Assistant />)

    await user.type(
      screen.getByPlaceholderText('Pergunte algo sobre suas despesas...'),
      'oi{enter}',
    )

    expect(await screen.findByText('aguarde 5s antes de mandar outra mensagem')).toBeInTheDocument()
  })

  it('sends a suggestion chip as the message when clicked', async () => {
    useAppStore.setState({ friends: [friend] })
    vi.mocked(api.sendAssistantMessage).mockResolvedValue('Aqui está seu saldo.')

    const user = userEvent.setup()
    render(<Assistant />)

    await user.click(screen.getByRole('button', { name: 'Qual o meu saldo com cada amigo?' }))

    expect(await screen.findByText('Qual o meu saldo com cada amigo?')).toBeInTheDocument()
    expect(api.sendAssistantMessage).toHaveBeenCalledWith('Qual o meu saldo com cada amigo?', [])
  })

  it('resends the previous turns as history on the second message', async () => {
    vi.mocked(api.sendAssistantMessage).mockResolvedValueOnce('primeira resposta')
    vi.mocked(api.sendAssistantMessage).mockResolvedValueOnce('segunda resposta')

    const user = userEvent.setup()
    render(<Assistant />)

    const input = screen.getByPlaceholderText('Pergunte algo sobre suas despesas...')
    await user.type(input, 'primeira pergunta{enter}')
    await screen.findByText('primeira resposta')

    await user.type(input, 'segunda pergunta{enter}')
    await screen.findByText('segunda resposta')

    expect(api.sendAssistantMessage).toHaveBeenLastCalledWith('segunda pergunta', [
      { role: 'user', text: 'primeira pergunta' },
      { role: 'model', text: 'primeira resposta' },
    ])
  })
})
