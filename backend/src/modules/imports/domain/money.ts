// Money read from a file cell → DECIMAL(19,4) text (README §4: money travels as decimal strings; CLAUDE.md: never
// a JS number for money). Prisma's Decimal (decimal.js) does the rounding.
import { Prisma } from '../../../generated/prisma/client.js'

const DECIMAL_TEXT = /^-?\d+(\.\d+)?$/
const SCALE = 4

/** "16.22" → "16.2200", "72.09999999999999" → "72.1000" (half up); anything else (empty, "12,50", "abc") → null. */
export function parseMoney(text: string): string | null {
  const trimmed = text.trim()
  if (!DECIMAL_TEXT.test(trimmed)) return null
  return new Prisma.Decimal(trimmed).toDecimalPlaces(SCALE, Prisma.Decimal.ROUND_HALF_UP).toFixed(SCALE)
}
