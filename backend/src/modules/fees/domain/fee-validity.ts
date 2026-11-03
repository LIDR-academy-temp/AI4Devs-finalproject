// Validity rules of a fee (README §3.2 Fee; admin-fees design D7): its status against today. Days are YYYY-MM-DD
// civil dates, so they compare as text; NULL is ±∞.
import type { FeeStatus } from '@recon/shared'
import type { FeeValidity } from './fee-selection.js'

/** Scheduled if it starts after today, closed if it ended before today, active otherwise. */
export function statusOf(fee: FeeValidity, today: string): FeeStatus {
  if (fee.startDate !== null && fee.startDate > today) return 'scheduled'
  if (fee.endDate !== null && fee.endDate < today) return 'closed'
  return 'active'
}

const newYork = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar day of an instant in New York (daylight saving included), as YYYY-MM-DD. */
export function newYorkDay(instant: Date): string {
  const p = Object.fromEntries(newYork.formatToParts(instant).map((part) => [part.type, part.value]))
  return `${p.year}-${p.month}-${p.day}`
}
