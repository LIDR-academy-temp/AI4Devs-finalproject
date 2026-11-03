// How a fee reads on screen (web-admin-fees design D6). Amounts and rates stay text; nothing is computed.
import { TRANSACTION_STATUSES } from '@recon/shared'
import { formatDecimal, rateToPercent } from '@/lib/format'
import { strings } from './strings'

/** "0.029000" → "2.900 %": at least three decimals, the fourth only when it is there (nothing is rounded). */
export function formatRate(rate: string): string {
  const [whole, fraction = ''] = rateToPercent(rate).split('.')
  return strings.rate(`${whole}.${fraction.padEnd(3, '0')}`)
}

/** The fixed amount, the rate, or both. */
export function formatFeeValue(fee: { fixedAmount: string | null; percentage: string | null }): string {
  const amount = fee.fixedAmount === null ? null : formatDecimal(fee.fixedAmount)
  const rate = fee.percentage === null ? null : formatRate(fee.percentage)
  if (amount !== null && rate !== null) return strings.valueBoth(amount, rate)
  return amount ?? rate ?? ''
}

/** null start: since forever. */
export const formatValidFrom = (startDate: string | null) => startDate ?? strings.always

/** null end: no end. */
export const formatValidTo = (endDate: string | null) => endDate ?? strings.open

export const formatValidity = (startDate: string | null, endDate: string | null) =>
  strings.validityArrow(formatValidFrom(startDate), formatValidTo(endDate))

interface FeeTypeLike {
  feeTypeId: number
  isTransactional: boolean
  appliesToStatusId: number | null
  allowsFreeAmount: boolean
}

/** "E · Successful" for a per-movement fee (the cycle of its status), "batch · preset" or "batch · free amount". */
export function feeAppliesTo(feeTypeId: number, types: readonly FeeTypeLike[] | undefined): string {
  const type = types?.find((t) => t.feeTypeId === feeTypeId)
  if (!type) return strings.appliesTo.unknown
  if (!type.isTransactional) return type.allowsFreeAmount ? strings.appliesTo.freeAmount : strings.appliesTo.preset
  const status = TRANSACTION_STATUSES.find((s) => s.statusId === type.appliesToStatusId)
  return status ? strings.appliesTo.status(status.cycle, status.name) : strings.appliesTo.unknown
}
