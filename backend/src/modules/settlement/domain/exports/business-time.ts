// Business dates in the exports (design D7, business-dates-no-z D4): New York wall time without a zone, written as it
// arrives, without going through Date.

/** "2026-10-07T23:58:40" → "2026-10-07 23:58:40": the digits as they arrive, whatever the process zone. */
export function businessTime(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 19)}`
}
