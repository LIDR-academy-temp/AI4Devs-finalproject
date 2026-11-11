// Prisma Decimal → API strings (README §4: money and percentages travel as decimal strings, never numbers).
import type { Prisma } from '../generated/prisma/client.js'

type Decimal = Prisma.Decimal

/** DECIMAL(19,4) → "50000.0000". */
export function toMoney(value: Decimal): string
export function toMoney(value: Decimal | null): string | null
export function toMoney(value: Decimal | null): string | null {
  return value === null ? null : value.toFixed(4)
}

/** DECIMAL(9,6) fraction → "0.100000". */
export function toPercentage(value: Decimal): string
export function toPercentage(value: Decimal | null): string | null
export function toPercentage(value: Decimal | null): string | null {
  return value === null ? null : value.toFixed(6)
}
