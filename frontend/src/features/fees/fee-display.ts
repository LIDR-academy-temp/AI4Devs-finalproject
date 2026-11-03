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

/** The configuration a history row keeps (FeeSnapshot of @recon/shared). */
export interface FeeSnapshotLike {
  fixedAmount: string | null
  percentage: string | null
  conditionalPercentage: string | null
  conditionThresholdAmt: string | null
  brandFixedAmount: string | null
  brandPercentage: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
}

type SnapshotField = keyof FeeSnapshotLike
const SNAPSHOT_FIELDS: readonly SnapshotField[] = [
  'fixedAmount',
  'percentage',
  'conditionalPercentage',
  'conditionThresholdAmt',
  'brandFixedAmount',
  'brandPercentage',
  'startDate',
  'endDate',
  'description',
]
const RATES = new Set<SnapshotField>(['percentage', 'conditionalPercentage', 'brandPercentage'])
const AMOUNTS = new Set<SnapshotField>(['fixedAmount', 'conditionThresholdAmt', 'brandFixedAmount'])

function snapshotValue(field: SnapshotField, value: string | null): string {
  if (field === 'startDate') return formatValidFrom(value)
  if (field === 'endDate') return formatValidTo(value)
  if (value === null) return strings.history.none
  if (RATES.has(field)) return formatRate(value)
  if (AMOUNTS.has(field)) return formatDecimal(value)
  return value
}

/**
 * What a history row says: the fields that changed (`Percentage: 2.500 % → 2.750 %`), or, for a row without
 * `before` (created, copied), the configuration it started with.
 */
export function historyLines(before: FeeSnapshotLike | null, after: FeeSnapshotLike): string[] {
  const h = strings.history
  if (before === null) {
    return SNAPSHOT_FIELDS.filter((field) => field === 'startDate' || field === 'endDate' || after[field] !== null).map(
      (field) => h.value(h.fields[field], snapshotValue(field, after[field])),
    )
  }
  return SNAPSHOT_FIELDS.filter((field) => before[field] !== after[field]).map((field) =>
    h.change(h.fields[field], snapshotValue(field, before[field]), snapshotValue(field, after[field])),
  )
}

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
