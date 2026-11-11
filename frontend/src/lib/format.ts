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
//   without a zone, and the API sends them without one ("2026-09-28T00:04:11"): their digits are shown as they
//   arrive, without Date or Intl, so the browser's zone never moves them (business-dates-no-z D5);
// - audit instants (runAt, changedAt, reviewedAt…) are real UTC instants and are converted to New York time.
// Only a date with a time carries the ET suffix: a day alone (settlement date, fee validity, expected release) is
// the same day in any zone that matters here, and the suffix added nothing (ui-polish design D12).

/** The zone dates are shown in, never the browser's. */
export const DISPLAY_TIME_ZONE = 'America/New_York'
export const DISPLAY_ZONE_LABEL = 'ET'

/** New York wall-clock time without a zone ("2026-09-28T00:04:11"), or a day alone ("2026-10-24"). */
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
  return withTime ? `${date} ${p.hour}:${p.minute} ${DISPLAY_ZONE_LABEL}` : date
}

/** "2026-09-28": the day digits as they arrive. */
export function formatBusinessDate(value: BusinessDate): string {
  return value.slice(0, 10)
}

/** "2026-09-28 00:04 ET": the day, hour and minute digits as they arrive. */
export function formatBusinessDateTime(value: BusinessDate): string {
  return `${value.slice(0, 10)} ${value.slice(11, 16)} ${DISPLAY_ZONE_LABEL}`
}

/** "2026-10-18 10:20 ET": the UTC instant in New York time, daylight saving included. */
export function formatAuditDateTime(value: AuditInstant): string {
  return compose(value, DISPLAY_TIME_ZONE, true)
}

/** "2026-10-18": the New York day of a UTC instant (the last change of a fee). */
export function formatAuditDate(value: AuditInstant): string {
  return compose(value, DISPLAY_TIME_ZONE, false)
}

/**
 * Today's calendar day in New York as YYYY-MM-DD (web-admin-fees design D5). A default value only: the API decides
 * which days are allowed.
 */
export function newYorkToday(now: Date = new Date()): string {
  return compose(now.toISOString(), DISPLAY_TIME_ZONE, false)
}

// Percentages (web-admin-fees design D6): the user writes a percent ("2.75"), the API takes a fraction from 0 to 1
// with up to 6 decimals ("0.027500"). Both are text; the decimal point is moved on the digits, never through a number.

const PERCENT = /^(\d+)(?:\.(\d+))?$/

export type PercentError = 'invalid' | 'too_precise' | 'out_of_range'

/** Why a written percent cannot be sent, or null: digits with an optional point, up to 4 decimals, 0 to 100. */
export function percentError(value: string): PercentError | null {
  const match = PERCENT.exec(value.trim())
  if (!match) return 'invalid'
  const [, integer = '', fraction = ''] = match
  if (fraction.length > 4) return 'too_precise'
  // Compared as text: without leading zeros, a longer integer part is larger, and two of the same length compare
  // digit by digit.
  const whole = integer.replace(/^0+(?=\d)/, '')
  const above100 = whole.length > 3 || (whole.length === 3 && whole > '100')
  if (above100 || (whole === '100' && /[1-9]/.test(fraction))) return 'out_of_range'
  return null
}

/** "2.75" → "0.027500". Throws on a value percentError refuses. */
export function percentToRate(percent: string): string {
  const reason = percentError(percent)
  if (reason) throw new Error(`Invalid percentage (${reason}): ${percent}`)
  const [, integer = '', fraction = ''] = PERCENT.exec(percent.trim()) ?? []
  const padded = integer.padStart(3, '0')
  const whole = padded.slice(0, -2).replace(/^0+(?=\d)/, '')
  return `${whole}.${(padded.slice(-2) + fraction).padEnd(6, '0')}`
}

/**
 * "15", "15.0", "015.0000" → "15": the same amount written in different ways, to compare decimals as text without
 * a JS number (web-admin-fees design D4, web-admin-accounts design D5).
 */
export function canonicalDecimal(value: string | null): string | null {
  if (value === null) return null
  const negative = value.startsWith('-')
  const [integer = '0', fraction = ''] = (negative ? value.slice(1) : value).split('.')
  const whole = integer.replace(/^0+(?=\d)/, '')
  const rest = fraction.replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${rest ? `.${rest}` : ''}`
}

/** "0.027500" → "2.75": the shortest percent, without trailing zeros. */
export function rateToPercent(rate: string): string {
  const [integer = '0', fraction = ''] = rate.split('.')
  const digits = fraction.padEnd(2, '0')
  const whole = (integer + digits.slice(0, 2)).replace(/^0+(?=\d)/, '')
  const rest = digits.slice(2).replace(/0+$/, '')
  return rest ? `${whole}.${rest}` : whole
}
