// The amount of a fee on a base (README §3.2 Fee; gate of settlement-process, P1): fixed + percentage × base, in
// DECIMAL(19,4); only the product that has more than 4 decimals rounds half up in the fourth. Never a JS number.
import { Prisma } from '../../../generated/prisma/client.js'

export interface FeeConfiguration {
  fixedAmount: string | null
  percentage: string | null
}

export function feeAmountOf(fee: FeeConfiguration, base: string): string {
  const percentPart =
    fee.percentage === null
      ? new Prisma.Decimal(0)
      : new Prisma.Decimal(base).times(fee.percentage).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP)
  return percentPart.plus(fee.fixedAmount ?? 0).toFixed(4)
}
