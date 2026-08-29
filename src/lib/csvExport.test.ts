import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportFriendActivityCsv, friendActivityToCsv } from './csvExport'
import type { Expense, Friend, Settlement } from '../types'

const friend: Friend = { id: 'f1', name: 'Bia Souza', initials: 'BS', color: '#f59e0b' }

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    friendId: 'f1',
    description: 'Mercado',
    category: 'groceries',
    amount: 100,
    paidBy: 'me',
    splitType: 'equal',
    myShare: 50,
    friendShare: 50,
    date: '2026-03-05',
    createdAt: '2026-03-05T12:00:00Z',
    settled: false,
    ...overrides,
  }
}

function makeSettlement(overrides: Partial<Settlement> = {}): Settlement {
  return {
    id: 's1',
    friendId: 'f1',
    amount: 50,
    direction: 'me_to_friend',
    date: '2026-03-10',
    ...overrides,
  }
}

describe('friendActivityToCsv', () => {
  it('starts with a UTF-8 BOM and the header row', () => {
    const csv = friendActivityToCsv([], [], friend)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('Data,Tipo,Descrição')
  })

  it('renders an expense row with amounts and labels', () => {
    const csv = friendActivityToCsv([makeExpense()], [], friend)
    expect(csv).toContain('05/03/2026,Despesa,Mercado')
    expect(csv).toContain('100.00,50.00,50.00')
    expect(csv).toContain('Dividido igualmente')
  })

  it('uses the friend name when they paid', () => {
    const csv = friendActivityToCsv([makeExpense({ paidBy: 'friend' })], [], friend)
    expect(csv).toContain('Bia Souza')
  })

  it('renders a settlement as a Pagamento row without category/split', () => {
    const csv = friendActivityToCsv([], [makeSettlement()], friend)
    const line = csv.split('\r\n')[1]
    expect(line).toContain('10/03/2026,Pagamento')
    expect(line).toContain('50.00,50.00,0.00')
  })

  it('flips shares when the friend is the one who paid', () => {
    const csv = friendActivityToCsv([], [makeSettlement({ direction: 'friend_to_me' })], friend)
    const line = csv.split('\r\n')[1]
    expect(line).toContain('Bia Souza,50.00,0.00,50.00')
  })

  it('sorts expenses and settlements chronologically', () => {
    const csv = friendActivityToCsv(
      [makeExpense({ date: '2026-03-10' })],
      [makeSettlement({ date: '2026-03-01' })],
      friend,
    )
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('Pagamento')
    expect(lines[2]).toContain('Despesa')
  })

  it('quotes fields containing the delimiter, quotes, or newlines', () => {
    const csv = friendActivityToCsv(
      [makeExpense({ description: 'Pizza, "bem" grande' })],
      [],
      friend,
    )
    expect(csv).toContain('"Pizza, ""bem"" grande"')
  })

  it('collapses multi-line notes into a single line', () => {
    const csv = friendActivityToCsv([makeExpense({ notes: 'linha 1\nlinha 2' })], [], friend)
    expect(csv).toContain('linha 1 linha 2')
    expect(csv).not.toContain('linha 1\nlinha 2')
  })
})

describe('exportFriendActivityCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('builds a blob, triggers a download link, and cleans up the object URL', () => {
    vi.setSystemTime(new Date(2026, 2, 5))
    const createObjectURL = vi.fn().mockReturnValue('blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    const clickSpy = vi.fn()
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')
    const createElementSpy = vi.spyOn(document, 'createElement')

    exportFriendActivityCsv([], [], friend)

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const link = createElementSpy.mock.results.find(
      (r) => (r.value as HTMLElement).tagName === 'A',
    )?.value as HTMLAnchorElement
    expect(link.download).toBe('despesas-bia-souza-2026-03-05.csv')
    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    clickSpy.mockReset()
  })
})
