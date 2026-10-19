// The settlement engine (settlement-process design D2): one pure calculation for the preview and for processing.
import { businessDay } from '../../fees/domain/fee-selection.js'
import { validateBatchFees } from './batch-fees.js'
import { attemptFor, proposeBatchNumber } from './batch-number.js'
import { type BatchChannels, batchChannels } from './channels.js'
import { classifyRows } from './inclusion.js'
import { ZERO } from './money.js'
import { buildMovements } from './movements.js'
import { type BatchSummary, summarize } from './totals.js'
import type {
  AccountAttempt,
  BatchFeeInvalidReason,
  BatchFeePlan,
  MovementPlan,
  SettlementInput,
  SettlementWarning,
  Skipped,
} from './types.js'

export interface SettlementPlan {
  batchNo: number
  attemptNo: number
  /** false: an active attempt of the account holds the number (processing answers 409 batch_no_taken). */
  batchNoAvailable: boolean
  holder: AccountAttempt | null
  movements: MovementPlan[]
  /** In the order of the request; empty when one of them is invalid. */
  batchFees: BatchFeePlan[]
  /** The first invalid batch fee (400 batch_fee_invalid), or null. */
  batchFeeError: { index: number; reason: BatchFeeInvalidReason } | null
  summary: BatchSummary
  skipped: Skipped
  warnings: SettlementWarning[]
  channels: BatchChannels
  dateRanges: SettlementInput['ranges']
}

export function computeSettlement(input: SettlementInput): SettlementPlan {
  if (input.options.transactionalFees) throw new Error('transactional fees are not implemented yet (design D17)')
  const proposed = proposeBatchNumber(input.attempts, input.importId)
  const batchNo = input.request.batchNo ?? proposed.batchNo
  const { attemptNo, available, holder } = attemptFor(input.attempts, batchNo)

  const channels = new Map(input.channels.map((c) => [c.channelId, c]))
  const { processed, skipped } = classifyRows(input.rows, input.inclusions)
  const built = buildMovements(processed, {
    channels,
    previousE: input.previousE,
    policy: input.account.chargebackReservePolicy,
  })

  const batchFees = validateBatchFees(input.request.batchFees ?? [], {
    feeTypes: input.feeTypes,
    fees: input.fees,
    prefilledFeeTypeIds: input.prefilledFeeTypeIds,
    referenceDay: referenceDay(input),
  })

  const warnings: SettlementWarning[] = [{ code: 'transactional_fees_not_computed' }, ...built.warnings]
  if (input.account.rollingReserveCapAmt !== null) warnings.push({ code: 'reserve_cap_not_applied' })
  if (
    input.account.chargebackReservePolicy === 'release_on_chargeback' &&
    built.movements.some((m) => m.cycle === 'I' && m.statusCode === 'Chargeback')
  )
    warnings.push({ code: 'chargeback_reserve_policy_not_applied' })

  return {
    batchNo,
    attemptNo,
    batchNoAvailable: available,
    holder,
    movements: built.movements,
    batchFees: batchFees.ok ? batchFees.fees : [],
    batchFeeError: batchFees.ok ? null : { index: batchFees.index, reason: batchFees.reason },
    summary: summarize(built.movements, batchFees.ok ? batchFees.otherFeeAmt : ZERO),
    skipped,
    warnings,
    channels: batchChannels(built.movements, channels),
    dateRanges: input.ranges,
  }
}

/** Business day of reference of the batch (P8): settlementDate, or the latest max of the run's ranges. */
function referenceDay(input: SettlementInput): string | null {
  if (input.request.settlementDate !== undefined) return input.request.settlementDate
  const maxes = Object.values(input.ranges).flatMap((r) => (r === null ? [] : [businessDay(r.max)]))
  return maxes.length === 0 ? null : maxes.sort().at(-1)!
}
