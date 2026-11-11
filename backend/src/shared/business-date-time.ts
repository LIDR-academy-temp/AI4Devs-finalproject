// Business dates on the wire (business-dates-no-z D1, D3): New York wall time as stored in DATETIME2, without a zone
// or milliseconds. Audit instants are UTC and keep toISOString().

/**
 * A business date as the API sends it: "2026-09-28T00:04:11". Prisma reads a DATETIME2 as a Date whose UTC digits are
 * the stored ones, so they are taken as they are and never depend on the process zone.
 */
export function businessDateTime(value: Date): string {
  return value.toISOString().slice(0, 19)
}
