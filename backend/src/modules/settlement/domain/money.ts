// Money of the settlement engine (gate of settlement-process, P1): DECIMAL(19,4) text in and out, Prisma's Decimal
// (decimal.js) in between, never a JS number. A product with more than 4 decimals rounds half up in the fourth.
import { Prisma } from '../../../generated/prisma/client.js'

export type Decimal = Prisma.Decimal
export const Decimal = Prisma.Decimal
/** A DECIMAL as text (as it travels) or as a Decimal; never a JS number. */
export type Value = string | Prisma.Decimal

export const ZERO = '0.0000'

/** 4 decimals, half up in the fourth. */
export function amount4(value: Value): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP)
}

/** DECIMAL(19,4) text. */
export function text4(value: Value): string {
  return amount4(value).toFixed(4)
}

/** Exact sum of DECIMAL texts. */
export function sum(values: readonly Value[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((total, v) => total.plus(v), new Prisma.Decimal(0))
}

/** amount × percentage, 4 decimals. */
export function percentOf(amount: Value, percentage: Value): string {
  return text4(new Prisma.Decimal(amount).times(percentage))
}

const DAY_MS = 86_400_000

/** A business date plus whole days (wall time stored without zone: plain millisecond arithmetic). */
export function plusDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}
