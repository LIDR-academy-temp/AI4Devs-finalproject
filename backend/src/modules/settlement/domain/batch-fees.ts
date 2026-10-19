// Batch fees of the request (settlement-process design D13; spec settlement "Fees por batch prellenados"): a preset of
// the account in force at the batch reference day, or a free amount with its category. A pre-filled fee of the
// Other Fees sheet may be a free amount of any batch type (P7); a free amount added by hand needs a description.
import { isInForce } from '../../fees/domain/fee-selection.js'
import { sum, text4 } from './money.js'
import type {
  AccountFeeConfig,
  BatchFeeInput,
  BatchFeeInvalidReason,
  BatchFeePlan,
  SettlementFeeType,
} from './types.js'

export interface BatchFeeContext {
  feeTypes: readonly SettlementFeeType[]
  /** Fees of the account (any validity). */
  fees: readonly AccountFeeConfig[]
  /** feeTypeIds pre-filled from the Other Fees sheet of the import. */
  prefilledFeeTypeIds: ReadonlySet<number>
  /** Business day the presets must be in force at (P8); null when the batch has none. */
  referenceDay: string | null
}

export type BatchFeeResult =
  | { ok: true; fees: BatchFeePlan[]; otherFeeAmt: string }
  | { ok: false; index: number; reason: BatchFeeInvalidReason }

/** Validates in the order of the request and stops at the first invalid fee; the valid ones keep that order. */
export function validateBatchFees(inputs: readonly BatchFeeInput[], ctx: BatchFeeContext): BatchFeeResult {
  const fees: BatchFeePlan[] = []
  for (const [index, input] of inputs.entries()) {
    const reason = invalidReason(input, ctx)
    if (reason !== null) return { ok: false, index, reason }
    const type = ctx.feeTypes.find((t) => t.feeTypeId === input.feeTypeId)!
    const description = input.description?.trim() ?? ''
    fees.push({
      feeTypeId: type.feeTypeId,
      code: type.code,
      title: type.title,
      feeId: input.feeId,
      amount: text4(input.amount),
      description: description === '' ? null : description,
      source: input.source,
    })
  }
  return { ok: true, fees, otherFeeAmt: sum(fees.map((f) => f.amount)).toFixed(4) }
}

function invalidReason(input: BatchFeeInput, ctx: BatchFeeContext): BatchFeeInvalidReason | null {
  const type = ctx.feeTypes.find((t) => t.feeTypeId === input.feeTypeId)
  if (!type) return 'unknown_fee_type'
  if (type.isTransactional) return 'transactional_fee_type'
  if (input.feeId !== null) {
    const preset = ctx.fees.find((f) => f.feeId === input.feeId)
    if (!preset) return 'fee_not_in_account'
    if (preset.feeTypeId !== input.feeTypeId) return 'fee_type_mismatch'
    if (ctx.referenceDay !== null && !isInForce(preset, ctx.referenceDay)) return 'fee_not_in_force'
    return null
  }
  const fromFile = input.source === 'file' && ctx.prefilledFeeTypeIds.has(input.feeTypeId)
  if (!type.allowsFreeAmount && !fromFile) return 'free_amount_not_allowed'
  if (input.source === 'manual' && (input.description ?? '').trim() === '') return 'description_required'
  return null
}
