// Totals of a batch (settlement-process design D15; spec settlement "Totales del batch y amount payable"): the five
// categories with positive amounts (the CHB 2 counts in qty and fees, not in amount), the deposits by brand, MDR,
// reserves, and the amount payable with its breakdown. Exact sums of 4-decimal texts.
import { SETTLEMENT_CATEGORIES, type SettlementCategory } from '@recon/shared'
import { sum } from './money.js'
import { payableBreakdown } from './payable-breakdown.js'
import type { MovementPlan, PayableLine } from './types.js'

export interface CategoryTotalPlan {
  category: SettlementCategory
  qty: number
  amount: string
  feeAmount: string
  feeRate: string | null
}

export interface BatchSummary {
  totals: CategoryTotalPlan[]
  brandTotals: { cardBrand: string; qty: number; amount: string }[]
  reservesReleasedQty: number
  mdrAmt: string
  mdrRate: string | null
  transactionalFeeAmt: string
  otherFeeAmt: string
  reserveHeldAmt: string
  reserveReleasedAmt: string
  reserveEarlyReleasedAmt: string
  amountPayable: string
  payableBreakdown: PayableLine[]
}

const MDR = 'MDR'
const UNKNOWN_BRAND = 'UNKNOWN'

function categoryOf(m: MovementPlan): SettlementCategory | null {
  if (m.cycle === 'E') return m.statusCode === 'Declined' ? 'declined' : 'deposit'
  if (m.cycle === 'I') {
    if (m.statusCode === 'Chargeback') return 'chargeback'
    if (m.statusCode === 'Refund') return 'refund'
    if (m.statusCode === 'RDR') return 'rdr'
  }
  return null
}

const total = (values: readonly string[]) => sum(values).toFixed(4)
const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export function summarize(movements: readonly MovementPlan[], otherFeeAmt: string): BatchSummary {
  const mdrFees = movements.flatMap((m) => m.fees.filter((f) => f.code === MDR))
  const mdrRates = new Set(mdrFees.map((f) => f.percentage))
  const mdrRate = mdrRates.size === 1 ? ([...mdrRates][0] ?? null) : null
  const totals = SETTLEMENT_CATEGORIES.map((category) => {
    const of = movements.filter((m) => categoryOf(m) === category)
    return {
      category,
      qty: of.length,
      amount: total(of.filter((m) => !m.excludeAmount).map((m) => m.amount)),
      feeAmount: total(of.map((m) => m.feeAmount)),
      feeRate: category === 'deposit' ? mdrRate : null,
    }
  })
  const deposits = movements.filter((m) => categoryOf(m) === 'deposit')
  const brands = [...new Set(deposits.map((m) => m.cardBrand ?? UNKNOWN_BRAND))].sort(byCode)
  const brandTotals = brands.map((cardBrand) => {
    const of = deposits.filter((m) => (m.cardBrand ?? UNKNOWN_BRAND) === cardBrand)
    return { cardBrand, qty: of.length, amount: total(of.map((m) => m.amount)) }
  })
  const amountOf = (category: SettlementCategory) => totals.find((t) => t.category === category)!.amount
  const transactionalFeeAmt = total(movements.map((m) => m.feeAmount))
  const reserveHeldAmt = total(movements.map((m) => m.reserveHeldAmt))
  const reserveReleasedAmt = total(movements.map((m) => m.reserveReleasedAmt))
  const reserveEarlyReleasedAmt = total(movements.map((m) => m.reserveEarlyReleasedAmt))
  const breakdown = payableBreakdown({
    deposit: amountOf('deposit'),
    chargeback: amountOf('chargeback'),
    refund: amountOf('refund'),
    rdr: amountOf('rdr'),
    transactionalFees: transactionalFeeAmt,
    batchFees: total([otherFeeAmt]),
    reserveHeld: reserveHeldAmt,
    reserveReleased: reserveReleasedAmt,
    reserveEarlyReleased: reserveEarlyReleasedAmt,
  })
  return {
    totals,
    brandTotals,
    reservesReleasedQty: movements.filter((m) => m.cycle === 'R').length,
    mdrAmt: total(mdrFees.map((f) => f.amount)),
    mdrRate,
    transactionalFeeAmt,
    otherFeeAmt: total([otherFeeAmt]),
    reserveHeldAmt,
    reserveReleasedAmt,
    reserveEarlyReleasedAmt,
    amountPayable: breakdown.amountPayable,
    payableBreakdown: breakdown.lines,
  }
}
