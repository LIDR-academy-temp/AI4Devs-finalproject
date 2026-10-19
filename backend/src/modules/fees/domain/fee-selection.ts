// Which fee applies to an event (README §3.2 Fee; spec fees "Selección por fecha de evento"): the one whose validity
// covers the business day of the event, with NULL as ±∞ and both ends inclusive. Days are YYYY-MM-DD, so they compare
// as text.

export interface FeeValidity {
  /** NULL: since forever. */
  startDate: string | null
  /** NULL: no end. */
  endDate: string | null
}

/**
 * Day of a business date (New York wall time stored without zone). The adapter reads a datetime2 as if it were UTC,
 * so the day is the ISO date part as stored: no zone conversion, and never the current time.
 */
export function businessDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function isInForce(fee: FeeValidity, day: string): boolean {
  return (fee.startDate === null || fee.startDate <= day) && (fee.endDate === null || fee.endDate >= day)
}

/** The fee of a type in force on a day; the non-overlap rule (TR_Fee_NoOverlap) makes it unique. */
export function feeInForce<T extends FeeValidity & { feeTypeId: number }>(
  fees: readonly T[],
  feeTypeId: number,
  day: string,
): T | null {
  return fees.find((f) => f.feeTypeId === feeTypeId && isInForce(f, day)) ?? null
}
