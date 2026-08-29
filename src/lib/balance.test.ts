import { describe, expect, it } from 'vitest'
import {
  balanceFromResponse,
  describeBalance,
  formatBRL,
  netFromDirection,
  overallBalance,
  round2,
} from './balance'
import type { FriendBalanceResponse } from './api'

describe('netFromDirection', () => {
  it('is zero when even', () => {
    expect(netFromDirection(50, 'even')).toBe(0)
  })

  it('is positive when the friend owes me', () => {
    expect(netFromDirection(50, 'friend_to_me')).toBe(50)
  })

  it('is negative when I owe the friend', () => {
    expect(netFromDirection(50, 'me_to_friend')).toBe(-50)
  })
})

describe('balanceFromResponse', () => {
  it('converts the response amount/direction pair into a signed net', () => {
    const response: FriendBalanceResponse = { friendId: 'f1', amount: 30, direction: 'me_to_friend' }
    expect(balanceFromResponse(response)).toEqual({ friendId: 'f1', net: -30 })
  })
})

describe('overallBalance', () => {
  it('sums nets and rounds to 2 decimals', () => {
    const total = overallBalance([
      { friendId: 'a', net: 10.005 },
      { friendId: 'b', net: -5 },
    ])
    expect(total).toBeCloseTo(5.01)
  })

  it('returns 0 for an empty list', () => {
    expect(overallBalance([])).toBe(0)
  })
})

describe('round2', () => {
  it('rounds to 2 decimal places avoiding float error', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(10 / 3)).toBe(3.33)
  })
})

describe('formatBRL', () => {
  it('formats a value as BRL currency, always positive', () => {
    expect(formatBRL(-42.5)).toContain('42,50')
    expect(formatBRL(-42.5)).not.toContain('-')
  })
})

describe('describeBalance', () => {
  it('reports settled when the net is essentially zero', () => {
    expect(describeBalance(0.001)).toEqual({ text: 'Tudo quitado', tone: 'settled' })
  })

  it('says the friend owes me, with name when given', () => {
    const result = describeBalance(20, 'Bia')
    expect(result.tone).toBe('owed')
    expect(result.text).toContain('Bia te deve')
  })

  it('says the friend owes me, without name when omitted', () => {
    const result = describeBalance(20)
    expect(result.tone).toBe('owed')
    expect(result.text.startsWith('Te deve')).toBe(true)
  })

  it('says I owe the friend, with name when given', () => {
    const result = describeBalance(-20, 'Bia')
    expect(result.tone).toBe('owe')
    expect(result.text).toContain('a Bia')
  })

  it('says I owe the friend, without name when omitted', () => {
    const result = describeBalance(-20)
    expect(result.tone).toBe('owe')
    expect(result.text.startsWith('Você deve')).toBe(true)
  })
})
