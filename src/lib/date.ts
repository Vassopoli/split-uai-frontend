/**
 * Expense/Settlement `date` fields are "date-only" strings ("YYYY-MM-DD"),
 * with no time or zone info. `new Date("YYYY-MM-DD")` parses that as UTC
 * midnight, which rolls back to the previous day once formatted in any
 * negative-offset timezone (e.g. Brazil, UTC-3). Always go through this
 * parser instead so the date is built directly from local calendar fields.
 */
export function parseLocalDate(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Today's date as a "YYYY-MM-DD" local-calendar string (not UTC). */
export function todayLocalISODate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
