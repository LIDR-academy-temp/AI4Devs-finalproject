import { describe, expect, it } from 'vitest'
import { feeAmountOf } from './fee-amount.js'

// Spec fees "Selección por fecha de evento" (gate P1): fixed + percentage × base, 4 decimals; only the product that
// has more rounds half up in the fourth decimal.
const fee = (fixedAmount: string | null, percentage: string | null) => ({ fixedAmount, percentage })

describe('feeAmountOf', () => {
  it('a fixed fee is its amount', () => {
    expect(feeAmountOf(fee('0.6500', null), '100.0000')).toBe('0.6500')
  })

  it('a percentage keeps 4 decimals, not cents (12.3450 × 10 % = 1.2345)', () => {
    expect(feeAmountOf(fee(null, '0.100000'), '12.3450')).toBe('1.2345')
  })

  it('rounds half up a tie in the fifth decimal (12.3445 × 10 % = 1.23445 → 1.2345, not 1.2344)', () => {
    expect(feeAmountOf(fee(null, '0.100000'), '12.3445')).toBe('1.2345')
  })

  it('adds the fixed part to the rounded percentage', () => {
    expect(feeAmountOf(fee('0.6500', '0.100000'), '100.0000')).toBe('10.6500')
  })

  it('a fee with neither part is 0', () => {
    expect(feeAmountOf(fee(null, null), '100.0000')).toBe('0.0000')
  })
})
