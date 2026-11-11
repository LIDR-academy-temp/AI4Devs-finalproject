// Transactional fees of each movement (settlement-process design D10, D4; spec fees "Selección por fecha de evento"):
// every transactional type whose status is the movement's adds the fee in force at the business day of the event,
// with its amount and the configuration applied. R has none. An undated adjustment takes only a NULL…NULL fee that is
// the only one of its type (P6b); otherwise it gets no fee of that type and is reported.
import { feeAmountOf } from '../../fees/domain/fee-amount.js'
import { businessDay, feeInForce } from '../../fees/domain/fee-selection.js'
import { sum } from './money.js'
import type { AccountFeeConfig, AppliedFee, MovementPlan, SettlementFeeType, SettlementWarning } from './types.js'

export interface TransactionalFeeContext {
  fees: readonly AccountFeeConfig[]
  feeTypes: readonly SettlementFeeType[]
}

export interface TransactionalFeeResult {
  movements: MovementPlan[]
  /** Undated adjustments that went without a fee of their type. */
  skipped: { sheetId: string; rowNo: number }[]
  warnings: SettlementWarning[]
}

const hasVariant = (f: AccountFeeConfig) =>
  f.conditionalPercentage !== null ||
  f.conditionThresholdAmt !== null ||
  f.brandFixedAmount !== null ||
  f.brandPercentage !== null

export function applyTransactionalFees(
  movements: readonly MovementPlan[],
  ctx: TransactionalFeeContext,
): TransactionalFeeResult {
  const transactional = ctx.feeTypes.filter((t) => t.isTransactional)
  const transactionalIds = new Set(transactional.map((t) => t.feeTypeId))
  const accountHasAny = ctx.fees.some((f) => transactionalIds.has(f.feeTypeId))
  const skipped: TransactionalFeeResult['skipped'] = []
  const variants = new Set<string>()

  const result = movements.map((m) => {
    if (m.cycle === 'R') return m
    const day = m.eventDate === null ? null : businessDay(m.eventDate)
    const fees: AppliedFee[] = []
    let feeSkipped = false
    for (const type of transactional.filter((t) => t.appliesToStatusCode === m.statusCode)) {
      const ofType = ctx.fees.filter((f) => f.feeTypeId === type.feeTypeId)
      const applied =
        day !== null
          ? feeInForce(ofType, type.feeTypeId, day)
          : ofType.length === 1 && ofType[0]!.startDate === null && ofType[0]!.endDate === null
            ? ofType[0]!
            : null
      if (applied === null) {
        if (day === null && ofType.length > 0) feeSkipped = true
        continue
      }
      if (hasVariant(applied)) variants.add(applied.feeId)
      fees.push({
        feeId: applied.feeId,
        feeTypeId: type.feeTypeId,
        code: type.code,
        percentage: applied.percentage,
        amount: feeAmountOf(applied, m.gatewayAmount),
        configurationSnapshot: JSON.stringify({ fee: applied, base: m.gatewayAmount, day }),
      })
    }
    if (feeSkipped) skipped.push({ sheetId: m.sheetId, rowNo: m.rowNo })
    return { ...m, fees, feeAmount: sum(fees.map((f) => f.amount)).toFixed(4) }
  })

  const warnings: SettlementWarning[] = []
  if (!accountHasAny) warnings.push({ code: 'no_transactional_fees' })
  for (const feeId of variants) warnings.push({ code: 'fee_variant_not_applied', feeId })
  return { movements: result, skipped, warnings }
}
