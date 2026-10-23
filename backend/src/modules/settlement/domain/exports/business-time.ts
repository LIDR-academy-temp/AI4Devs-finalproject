// Business dates in the exports (design D7): New York wall time whose Z is transport only (debt #48), written without
// converting.

/** "2026-10-07T23:58:40.000Z" → "2026-10-07 23:58:40": the digits as they arrive, read in UTC so nothing moves. */
export function businessTime(value: string): string {
  const iso = new Date(value).toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`
}
