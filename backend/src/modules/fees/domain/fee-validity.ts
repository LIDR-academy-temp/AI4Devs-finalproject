// Validity rules of a fee (README §3.2 Fee; admin-fees design D6, D7): its status against today and the overlap of
// two validities of the same type. Days are YYYY-MM-DD civil dates, so they compare as text; NULL is ±∞.
import type { FeeStatus } from '@recon/shared'
import type { FeeValidity } from './fee-selection.js'

/** The validity of a fee of a type, as the overlap rule sees it. */
export interface FeeSpan extends FeeValidity {
  feeId: string
  feeTypeId: number
}

const SINCE_FOREVER = '0001-01-01'
const NO_END = '9999-12-31'

/**
 * The fees of `others` whose validity intersects the candidate's: same type, another fee, and
 * COALESCE(a.start, −∞) ≤ COALESCE(b.end, +∞) AND COALESCE(b.start, −∞) ≤ COALESCE(a.end, +∞), as TR_Fee_NoOverlap.
 */
export function findOverlaps<T extends FeeSpan>(candidate: FeeSpan, others: readonly T[]): T[] {
  const start = candidate.startDate ?? SINCE_FOREVER
  const end = candidate.endDate ?? NO_END
  return others.filter(
    (other) =>
      other.feeTypeId === candidate.feeTypeId &&
      other.feeId.toLowerCase() !== candidate.feeId.toLowerCase() &&
      start <= (other.endDate ?? NO_END) &&
      (other.startDate ?? SINCE_FOREVER) <= end,
  )
}

/** The civil day before a YYYY-MM-DD day. */
export function previousDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, date - 1)).toISOString().slice(0, 10)
}

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
