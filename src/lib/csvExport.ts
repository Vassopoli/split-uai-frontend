import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Expense, Friend, Settlement } from '../types'
import { CATEGORY_LABELS } from '../components/CategoryIcon'
import { SPLIT_LABELS } from '../components/ExpenseRow'
import { parseLocalDate, todayLocalISODate } from './date'

const DELIMITER = ','
/** Marks the file as UTF-8 for Excel, which otherwise mis-decodes accented pt-BR text. */
const UTF8_BOM = '﻿'

/** Decimal point (not comma) since ',' is the field delimiter here — a comma decimal would split the number across columns. */
function csvNumber(value: number): string {
  return value.toFixed(2)
}

function csvField(value: string): string {
  if (value.includes(DELIMITER) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvRow(fields: string[]): string {
  return fields.map(csvField).join(DELIMITER)
}

/** Collapses line breaks so a cell (e.g. multi-line receipt notes) never spans multiple visual lines. */
function singleLine(value: string): string {
  return value.replace(/\r\n|\r|\n/g, ' ').trim()
}

const HEADER = [
  'Data',
  'Tipo',
  'Descrição',
  'Categoria',
  'Pago por',
  'Valor total',
  'Sua parte',
  'Parte do outro usuário',
  'Tipo de divisão',
  'Notas',
]

interface CsvRecord {
  date: string
  fields: string[]
}

function expenseToRecord(e: Expense, friend: Friend): CsvRecord {
  return {
    date: e.date,
    fields: [
      format(parseLocalDate(e.date), 'dd/MM/yyyy', { locale: ptBR }),
      'Despesa',
      e.description,
      CATEGORY_LABELS[e.category],
      e.paidBy === 'me' ? 'Você' : friend.name,
      csvNumber(e.amount),
      csvNumber(e.myShare),
      csvNumber(e.friendShare),
      SPLIT_LABELS[e.splitType],
      singleLine(e.notes ?? ''),
    ],
  }
}

/**
 * A settlement is a straight cash transfer, not a split — "Sua parte"/"Parte
 * do outro usuário" here mean how much left each person's pocket in this
 * transaction, so it lines up with the expense shares above for reconciling
 * what's actually been paid vs. what's owed.
 */
function settlementToRecord(s: Settlement, friend: Friend): CsvRecord {
  const iPaid = s.direction === 'me_to_friend'
  return {
    date: s.date,
    fields: [
      format(parseLocalDate(s.date), 'dd/MM/yyyy', { locale: ptBR }),
      'Pagamento',
      singleLine(s.note ?? 'Pagamento'),
      '',
      iPaid ? 'Você' : friend.name,
      csvNumber(s.amount),
      csvNumber(iPaid ? s.amount : 0),
      csvNumber(iPaid ? 0 : s.amount),
      '',
      '',
    ],
  }
}

/** Builds a comma-delimited CSV of raw expenses and payments shared with `friend`, in chronological order. */
export function friendActivityToCsv(
  expenses: Expense[],
  settlements: Settlement[],
  friend: Friend,
): string {
  const records = [
    ...expenses.map((e) => expenseToRecord(e, friend)),
    ...settlements.map((s) => settlementToRecord(s, friend)),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const rows = records.map((r) => csvRow(r.fields))
  return [UTF8_BOM + csvRow(HEADER), ...rows].join('\r\n')
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Generates and triggers the download of a CSV with all expenses and payments shared with `friend`. */
export function exportFriendActivityCsv(
  expenses: Expense[],
  settlements: Settlement[],
  friend: Friend,
): void {
  const csv = friendActivityToCsv(expenses, settlements, friend)
  const filename = `despesas-${slugify(friend.name)}-${todayLocalISODate()}.csv`
  downloadCsv(filename, csv)
}
