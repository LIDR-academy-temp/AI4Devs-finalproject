/**
 * Groups the integer part of a decimal string with commas ("50000.0000" → "50,000.0000"). Works on the string
 * the API sends: money is never turned into a JS number (CLAUDE.md, README §3.2).
 */
export function formatDecimal(value: string): string {
  const negative = value.startsWith('-')
  const [integer = '', fraction] = (negative ? value.slice(1) : value).split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`
}

// Dates (web-validations design D11). Every date on screen is New York time, whatever the browser's zone:
// - business dates (transaction dates, ranges, relevantDate, batch dates) are New York wall-clock time stored
//   without a zone; the API sends them with a Z only as transport format, so they are shown without converting;
// - audit instants (runAt, changedAt, reviewedAt…) are real UTC instants and are converted to New York time.

/** The zone dates are shown in, never the browser's. */
export const DISPLAY_TIME_ZONE = 'America/New_York'
export const DISPLAY_ZONE_LABEL = 'ET'

/** New York wall-clock time sent with a Z that does not mean UTC (until #48 drops it). */
export type BusinessDate = string & { readonly __kind: 'business' }
/** A real UTC instant. */
export type AuditInstant = string & { readonly __kind: 'audit' }

export const businessDate = (value: string) => value as BusinessDate
export const auditInstant = (value: string) => value as AuditInstant

const formatters = new Map<string, Intl.DateTimeFormat>()

function parts(value: string, timeZone: string, withTime: boolean): Record<string, string> {
  const key = `${timeZone}|${withTime}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
    })
    formatters.set(key, formatter)
  }
  return Object.fromEntries(formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]))
}

function compose(value: string, timeZone: string, withTime: boolean): string {
  const p = parts(value, timeZone, withTime)
  const date = `${p.year}-${p.month}-${p.day}`
  return `${withTime ? `${date} ${p.hour}:${p.minute}` : date} ${DISPLAY_ZONE_LABEL}`
}

/** "2026-09-28 ET": the digits as they arrive, read in UTC so that nothing moves. */
export function formatBusinessDate(value: BusinessDate): string {
  return compose(value, 'UTC', false)
}

/** "2026-09-28 00:00 ET": the digits as they arrive, read in UTC so that nothing moves. */
export function formatBusinessDateTime(value: BusinessDate): string {
  return compose(value, 'UTC', true)
}

/** "2026-10-18 10:20 ET": the UTC instant in New York time, daylight saving included. */
export function formatAuditDateTime(value: AuditInstant): string {
  return compose(value, DISPLAY_TIME_ZONE, true)
}
