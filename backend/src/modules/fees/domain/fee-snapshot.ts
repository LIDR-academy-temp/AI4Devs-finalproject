// The configuration of a fee as FeeHistory keeps it (admin-fees design D10): written in API form (decimal strings,
// YYYY-MM-DD days) and read tolerantly, because the seed's history rows hold JSON numbers and the whole Prisma row.
import type { FeeSnapshot } from '@recon/shared'
import { Prisma } from '../../../generated/prisma/client.js'
import type { FeeState } from './fee-patch.js'

export function toSnapshot(fee: FeeState): FeeSnapshot {
  return {
    feeTypeId: fee.feeTypeId,
    fixedAmount: fee.fixedAmount,
    percentage: fee.percentage,
    conditionalPercentage: fee.conditionalPercentage,
    conditionThresholdAmt: fee.conditionThresholdAmt,
    brandFixedAmount: fee.brandFixedAmount,
    brandPercentage: fee.brandPercentage,
    startDate: fee.startDate,
    endDate: fee.endDate,
    description: fee.description,
  }
}

/** The text of FeeHistory.beforeJson / afterJson. */
export function snapshotJson(fee: FeeState): string {
  return JSON.stringify(toSnapshot(fee))
}

const decimal = (value: unknown, places: number): string | null =>
  value === null || value === undefined ? null : new Prisma.Decimal(String(value)).toFixed(places)

const day = (value: unknown): string | null => (typeof value === 'string' ? value.slice(0, 10) : null)

/** A history JSON in API form, whatever wrote it: numbers become decimal strings, instants become days. */
export function readSnapshot(json: string): FeeSnapshot {
  const row = JSON.parse(json) as Record<string, unknown>
  return {
    feeTypeId: Number(row.feeTypeId),
    fixedAmount: decimal(row.fixedAmount, 4),
    percentage: decimal(row.percentage, 6),
    conditionalPercentage: decimal(row.conditionalPercentage, 6),
    conditionThresholdAmt: decimal(row.conditionThresholdAmt, 4),
    brandFixedAmount: decimal(row.brandFixedAmount, 4),
    brandPercentage: decimal(row.brandPercentage, 6),
    startDate: day(row.startDate),
    endDate: day(row.endDate),
    description: typeof row.description === 'string' ? row.description : null,
  }
}
