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
