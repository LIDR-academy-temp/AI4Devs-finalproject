// Audit instants in the exports (design D7): a real UTC instant shown in New York time, daylight saving included, with
// the same criterion as formatAuditDateTime on screen and a file-friendly format with seconds.

const TIME_ZONE = 'America/New_York'
const ZONE_LABEL = 'ET'

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** "2026-10-19T15:40:03.120Z" → "2026-10-19 11:40:03 ET". */
export function auditTime(instant: string | Date): string {
  const p = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]))
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${ZONE_LABEL}`
}
