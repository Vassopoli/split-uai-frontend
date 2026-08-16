import type { BalanceDirection, FriendBalance } from '../types'
import type { FriendBalanceResponse } from './api'

/** Converts the backend's amount/direction pair into a signed net (positive = friend owes me). */
export function netFromDirection(amount: number, direction: BalanceDirection): number {
  if (direction === 'even') return 0
  return direction === 'friend_to_me' ? amount : -amount
}

export function balanceFromResponse(response: FriendBalanceResponse): FriendBalance {
  return { friendId: response.friendId, net: netFromDirection(response.amount, response.direction) }
}

export function overallBalance(balances: FriendBalance[]): number {
  return round2(balances.reduce((sum, b) => sum + b.net, 0))
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value))
}

export interface BalanceDescription {
  text: string
  tone: 'owed' | 'owe' | 'settled'
}

/** net > 0: friend owes me. net < 0: I owe friend. */
export function describeBalance(net: number, friendFirstName: string): BalanceDescription {
  if (Math.abs(net) < 0.005) {
    return { text: 'Tudo quitado', tone: 'settled' }
  }
  if (net > 0) {
    return { text: `${friendFirstName} te deve ${formatBRL(net)}`, tone: 'owed' }
  }
  return { text: `Você deve ${formatBRL(net)} a ${friendFirstName}`, tone: 'owe' }
}
