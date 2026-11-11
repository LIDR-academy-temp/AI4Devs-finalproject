// RFC 4180 writer of the exports (design D5): comma, CRLF after every line, UTF-8 without BOM, and a value quoted only
// when it holds a comma, a double quote, CR or LF. Every value is already a string: money never goes through a number.

export const CRLF = '\r\n'

const NEEDS_QUOTES = /[",\r\n]/

/** A value as RFC 4180 writes it: quoted, with inner quotes doubled, only when it needs to be. */
export function csvField(value: string): string {
  return NEEDS_QUOTES.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** One record, ending in CRLF. */
export function csvRecord(values: readonly string[]): string {
  return values.map(csvField).join(',') + CRLF
}

/** The header and the rows. */
export function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return csvRecord(header) + rows.map(csvRecord).join('')
}
