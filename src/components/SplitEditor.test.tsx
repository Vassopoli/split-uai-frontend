import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SplitEditor, type SplitResult } from './SplitEditor'
import type { Friend } from '../types'

const friend: Friend = { id: 'f1', name: 'Bia Souza', initials: 'BS', color: '#f59e0b' }

/** Currency strings from Intl.NumberFormat('pt-BR', ...) use a non-breaking
 * space after "R$" — normalize it so string assertions don't need to embed
 * that invisible character. */
function denbsp(s: string) {
  return s.replace(/ /g, ' ')
}

function setup(amount = 100) {
  const onChange = vi.fn<(result: SplitResult) => void>()
  render(<SplitEditor amount={amount} friend={friend} onChange={onChange} />)
  return { onChange, user: userEvent.setup() }
}

function last(onChange: ReturnType<typeof vi.fn<(result: SplitResult) => void>>): SplitResult {
  const calls = onChange.mock.calls
  return calls[calls.length - 1][0]
}

describe('SplitEditor — igualmente', () => {
  it('splits the amount in half, giving the leftover cent to the friend', () => {
    const { onChange } = setup(99.99)
    const result = last(onChange)
    expect(result.splitType).toBe('equal')
    expect(result.myShare).toBeCloseTo(50)
    expect(result.friendShare).toBeCloseTo(49.99)
    expect(result.valid).toBe(true)
  })
})

describe('SplitEditor — por valor', () => {
  it('is invalid until the two shares add up to the total', async () => {
    const { onChange, user } = setup(100)
    await user.click(screen.getByRole('button', { name: 'Por valor' }))

    const [myInput, friendInput] = screen.getAllByRole('textbox')
    await user.clear(myInput)
    await user.type(myInput, '30')
    await user.clear(friendInput)
    await user.type(friendInput, '30')
    expect(last(onChange).valid).toBe(false)

    await user.clear(friendInput)
    await user.type(friendInput, '70')
    const result = last(onChange)
    expect(result.myShare).toBeCloseTo(30)
    expect(result.friendShare).toBeCloseTo(70)
    expect(result.valid).toBe(true)
  })
})

describe('SplitEditor — porcentagem', () => {
  it('is invalid until the two percentages add up to 100', async () => {
    const { onChange, user } = setup(200)
    await user.click(screen.getByRole('button', { name: 'Porcentagem' }))

    const [myPct, friendPct] = screen.getAllByRole('textbox')
    await user.clear(myPct)
    await user.type(myPct, '25')
    expect(last(onChange).valid).toBe(false)

    await user.clear(friendPct)
    await user.type(friendPct, '75')
    const result = last(onChange)
    expect(result.myShare).toBeCloseTo(50)
    expect(result.friendShare).toBeCloseTo(150)
    expect(result.valid).toBe(true)
  })
})

describe('SplitEditor — por item', () => {
  async function goToItemizedTab(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Por item' }))
  }

  it('derives the total from a single item assigned to me', async () => {
    const { onChange, user } = setup(0)
    await goToItemizedTab(user)

    const [labelInput, amountInput] = screen.getAllByRole('textbox')
    await user.type(labelInput, 'Pizza')
    await user.type(amountInput, '40')
    await user.click(screen.getByTitle('Seu'))

    const result = last(onChange)
    expect(result.splitType).toBe('exact')
    expect(result.valid).toBe(true)
    expect(result.itemizedAmount).toBeCloseTo(40)
    expect(result.myShare).toBeCloseTo(40)
    expect(result.friendShare).toBeCloseTo(0)
    expect(denbsp(result.itemizedNotes ?? '')).toBe('Pizza — R$ 40,00 (Você)')
  })

  it('splits a shared item in half between me and the friend', async () => {
    const { onChange, user } = setup(0)
    await goToItemizedTab(user)

    // item 1: mine only
    const [label1, amount1] = screen.getAllByRole('textbox')
    await user.type(label1, 'Pizza')
    await user.type(amount1, '40')
    await user.click(screen.getByTitle('Seu'))

    // item 2: shared with the friend
    await user.click(screen.getByRole('button', { name: /Adicionar item/ }))
    const textboxes = screen.getAllByRole('textbox')
    const label2 = textboxes[2]
    const amount2 = textboxes[3]
    await user.type(label2, 'Uber')
    await user.type(amount2, '20')
    // "Bia Souza" also matches the Avatar's inner div (nested inside the
    // toggle button), so filter down to just the buttons before indexing.
    const ownerButton = (title: string, index: number) =>
      screen.getAllByTitle(title).filter((el) => el.tagName === 'BUTTON')[index]
    await user.click(ownerButton('Seu', 1))
    await user.click(ownerButton('Bia Souza', 1))

    const result = last(onChange)
    expect(result.itemizedAmount).toBeCloseTo(60)
    expect(result.myShare).toBeCloseTo(50)
    expect(result.friendShare).toBeCloseTo(10)
    expect(result.valid).toBe(true)
    expect(denbsp(result.itemizedNotes ?? '')).toBe(
      'Pizza — R$ 40,00 (Você)\nUber — R$ 20,00 (Você, Bia)',
    )
  })

  it('stays invalid while any filled-in item has no owner', async () => {
    const { onChange, user } = setup(0)
    await goToItemizedTab(user)

    const [labelInput, amountInput] = screen.getAllByRole('textbox')
    await user.type(labelInput, 'Pizza')
    await user.type(amountInput, '40')

    expect(last(onChange).valid).toBe(false)
    expect(screen.getByText(/Marque de quem é/)).toBeInTheDocument()
  })

  // Regression test: unassignedItems/filledItems used to be recreated on
  // every render instead of memoized, which fed a new array reference into
  // the `result` useMemo every time and kept the onChange effect firing
  // forever ("Maximum update depth exceeded"). If that regresses, this
  // render throws instead of completing.
  it('does not loop indefinitely when switching to the itemized tab', async () => {
    const { onChange, user } = setup(0)
    await goToItemizedTab(user)

    expect(screen.getByRole('button', { name: /Adicionar item/ })).toBeInTheDocument()
    expect(onChange.mock.calls.length).toBeLessThan(20)
  })
})
