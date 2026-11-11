import { describe, expect, it } from 'vitest'
import { planCopy } from './fee-copy.js'
import type { FeeState } from './fee-patch.js'

// admin-accounts design D3; spec fees "Copia de fees al crear cuenta".

const TODAY = '2026-11-03'

const fee = (overrides: Partial<FeeState> & Pick<FeeState, 'feeId' | 'feeTypeId'>): FeeState => ({
  fixedAmount: null,
  percentage: null,
  conditionalPercentage: null,
  conditionThresholdAmt: null,
  brandFixedAmount: null,
  brandPercentage: null,
  startDate: null,
  endDate: null,
  description: null,
  ...overrides,
})

let counter = 0
const newId = () => `new-${++counter}`

describe('planCopy', () => {
  it('copies only the fees active today: a scheduled one from tomorrow and one closed yesterday stay out', () => {
    counter = 0
    const plan = planCopy(
      [
        fee({ feeId: 'mdr', feeTypeId: 1, percentage: '0.085000', startDate: '2026-01-01' }),
        fee({ feeId: 'chb', feeTypeId: 4, fixedAmount: '40.0000', endDate: '2026-11-02' }),
        fee({ feeId: 'next', feeTypeId: 4, fixedAmount: '45.0000', startDate: '2026-11-04' }),
      ],
      TODAY,
      newId,
    )

    expect(plan.map((p) => p.sourceFeeId)).toEqual(['mdr'])
  })

  it('copies a fee that closes today and one that starts today', () => {
    const plan = planCopy(
      [
        fee({ feeId: 'ends', feeTypeId: 2, fixedAmount: '0.5000', endDate: TODAY }),
        fee({ feeId: 'starts', feeTypeId: 3, fixedAmount: '0.2000', startDate: TODAY }),
      ],
      TODAY,
      newId,
    )

    expect(plan.map((p) => p.sourceFeeId)).toEqual(['ends', 'starts'])
  })

  it('keeps values, variants and description, with open validity and a new id', () => {
    counter = 0
    const source = fee({
      feeId: 'cond',
      feeTypeId: 105,
      percentage: '0.010000',
      conditionalPercentage: '0.020000',
      conditionThresholdAmt: '0.0100',
      brandFixedAmount: '1.0000',
      brandPercentage: '0.030000',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      description: 'Chargeback over 1 %',
    })

    const [copy] = planCopy([source], TODAY, newId)

    expect(copy).toEqual({
      sourceFeeId: 'cond',
      copy: { ...source, feeId: 'new-1', startDate: null, endDate: null },
    })
  })

  it('orders the copies by fee type and then by source id, whatever the input order', () => {
    const plan = planCopy(
      [
        fee({ feeId: 'b', feeTypeId: 5, fixedAmount: '4.0000' }),
        fee({ feeId: 'z', feeTypeId: 1, percentage: '0.085000' }),
        fee({ feeId: 'a', feeTypeId: 5, fixedAmount: '4.0000', description: 'other' }),
      ],
      TODAY,
      newId,
    )

    expect(plan.map((p) => p.sourceFeeId)).toEqual(['z', 'a', 'b'])
  })

  it('returns no copy when the source has no active fee', () => {
    expect(planCopy([], TODAY, newId)).toEqual([])
    expect(planCopy([fee({ feeId: 'old', feeTypeId: 1, endDate: '2026-01-01' })], TODAY, newId)).toEqual([])
  })

  it('does not change the source fees', () => {
    const source = fee({ feeId: 'mdr', feeTypeId: 1, percentage: '0.085000', startDate: '2026-01-01' })
    const before = structuredClone(source)

    planCopy([source], TODAY, newId)

    expect(source).toEqual(before)
  })
})
