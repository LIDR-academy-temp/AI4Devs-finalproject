import { describe, expect, it } from 'vitest'
import { movement } from '../test-support/builders.js'
import { summarize } from './totals.js'

// Spec settlement "Totales del batch y amount payable" (design D15): five categories, positive amounts, CHB 2 out of
// the chargeback amount, RDR deducted, 4 decimals.
const mdrFee = (amount: string) => ({
  feeId: 'fe000000-0000-4000-8000-000000000001',
  feeTypeId: 1,
  code: 'MDR',
  percentage: '0.100000',
  amount,
  configurationSnapshot: '{}',
})

const movements = [
  movement(2, { amount: '100.0000', reserveHeldAmt: '10.0000', feeAmount: '10.6500', fees: [mdrFee('10.0000')] }),
  movement(3, {
    amount: '50.5000',
    reserveHeldAmt: '5.0500',
    cardBrand: 'MC',
    feeAmount: '5.7000',
    fees: [mdrFee('5.0500')],
  }),
  movement(4, { statusCode: 'Declined', amount: '0.0000', feeAmount: '0.2500', cardBrand: null }),
  movement(5, { cycle: 'I', statusCode: 'Chargeback', amount: '40.0000', feeAmount: '45.0000' }),
  movement(6, { cycle: 'I', statusCode: 'Chargeback', amount: '40.0000', excludeAmount: true, feeAmount: '45.0000' }),
  movement(7, { cycle: 'I', statusCode: 'Refund', amount: '20.0000', feeAmount: '5.0000' }),
  movement(8, { cycle: 'I', statusCode: 'RDR', amount: '30.0000', feeAmount: '25.0000' }),
  movement(9, { cycle: 'R', statusCode: 'Successful', amount: '0.0000', reserveReleasedAmt: '7.2500' }),
]

describe('summarize', () => {
  const summary = summarize(movements, '-12.5000')

  it('writes the five categories in order, with positive amounts and the CHB 2 out of the chargeback amount', () => {
    expect(summary.totals).toEqual([
      { category: 'deposit', qty: 2, amount: '150.5000', feeAmount: '16.3500', feeRate: '0.100000' },
      { category: 'declined', qty: 1, amount: '0.0000', feeAmount: '0.2500', feeRate: null },
      { category: 'chargeback', qty: 2, amount: '40.0000', feeAmount: '90.0000', feeRate: null },
      { category: 'refund', qty: 1, amount: '20.0000', feeAmount: '5.0000', feeRate: null },
      { category: 'rdr', qty: 1, amount: '30.0000', feeAmount: '25.0000', feeRate: null },
    ])
  })

  it('writes every category even when it is empty', () => {
    expect(summarize([], '0.0000').totals.map((t) => [t.category, t.qty, t.amount])).toEqual([
      ['deposit', 0, '0.0000'],
      ['declined', 0, '0.0000'],
      ['chargeback', 0, '0.0000'],
      ['refund', 0, '0.0000'],
      ['rdr', 0, '0.0000'],
    ])
  })

  it('totals the deposits by brand, a missing brand as UNKNOWN', () => {
    expect(summary.brandTotals).toEqual([
      { cardBrand: 'MC', qty: 1, amount: '50.5000' },
      { cardBrand: 'VISA', qty: 1, amount: '100.0000' },
    ])
    expect(summarize([movement(2, { cardBrand: null })], '0').brandTotals).toEqual([
      { cardBrand: 'UNKNOWN', qty: 1, amount: '100.0000' },
    ])
  })

  it('sums MDR, transactional fees, reserves and releases', () => {
    expect(summary).toMatchObject({
      mdrAmt: '15.0500',
      mdrRate: '0.100000',
      transactionalFeeAmt: '136.6000',
      otherFeeAmt: '-12.5000',
      reserveHeldAmt: '15.0500',
      reserveReleasedAmt: '7.2500',
      reserveEarlyReleasedAmt: '0.0000',
      reservesReleasedQty: 1,
    })
  })

  it('amountPayable = deposits − chargebacks − refunds − RDR − fees − batch fees − held + released + early released', () => {
    // 150.5 − 40 − 20 − 30 − 136.6 − (−12.5) − 15.05 + 7.25 + 0
    expect(summary.amountPayable).toBe('-71.4000')
  })

  it('mdrRate is null when no MDR fee applied or when several MDR percentages did', () => {
    expect(summarize([movement(2)], '0').mdrRate).toBeNull()
    const other = { ...mdrFee('1.0000'), percentage: '0.095000' }
    expect(summarize([movement(2, { fees: [mdrFee('10.0000')] }), movement(3, { fees: [other] })], '0').mdrRate).toBe(
      null,
    )
  })
})
