import { describe, expect, it } from 'vitest'
import { Prisma } from '../../../generated/prisma/client.js'
import { payableBreakdown } from './payable-breakdown.js'

// Spec settlement "Desglose del amount payable" (gate decision P3): nine signed lines whose sum is amountPayable.
const parts = {
  deposit: '39181.0700',
  chargeback: '193.8600',
  refund: '843.9900',
  rdr: '391.5500',
  transactionalFees: '4336.6070',
  batchFees: '40.0000',
  reserveHeld: '3918.1070',
  reserveReleased: '4314.4040',
  reserveEarlyReleased: '0.0000',
}

const signedSum = (lines: ReturnType<typeof payableBreakdown>['lines']) =>
  lines
    .reduce((sum, l) => (l.sign === '+' ? sum.plus(l.amount) : sum.minus(l.amount)), new Prisma.Decimal(0))
    .toFixed(4)

describe('payableBreakdown', () => {
  it('has the nine lines in the fixed order, with their sign and an English label', () => {
    const { lines } = payableBreakdown(parts)

    expect(lines.map((l) => [l.code, l.sign, l.amount])).toEqual([
      ['deposit', '+', '39181.0700'],
      ['chargeback', '-', '193.8600'],
      ['refund', '-', '843.9900'],
      ['rdr', '-', '391.5500'],
      ['transactional_fees', '-', '4336.6070'],
      ['batch_fees', '-', '40.0000'],
      ['reserve_held', '-', '3918.1070'],
      ['reserve_released', '+', '4314.4040'],
      ['reserve_early_released', '+', '0.0000'],
    ])
    expect(lines.map((l) => l.label)).toEqual([
      'Deposits',
      'Chargebacks',
      'Refunds',
      'RDR',
      'Transaction fees',
      'Batch fees',
      'Reserve held',
      'Reserve released',
      'Reserve released on chargeback',
    ])
  })

  it('amountPayable is the signed sum of the lines (batch-clean oracle: 33771.3600)', () => {
    const { lines, amountPayable } = payableBreakdown(parts)

    expect(amountPayable).toBe('33771.3600')
    expect(signedSum(lines)).toBe(amountPayable)
  })

  it('the sum holds with negative batch fees (adjustments) and lines at zero', () => {
    const { lines, amountPayable } = payableBreakdown({ ...parts, batchFees: '-42.5000', rdr: '0.0000' })

    expect(lines.find((l) => l.code === 'rdr')?.amount).toBe('0.0000')
    expect(signedSum(lines)).toBe(amountPayable)
    expect(amountPayable).toBe('34245.4100')
  })
})
