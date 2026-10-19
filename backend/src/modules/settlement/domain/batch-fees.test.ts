import { describe, expect, it } from 'vitest'
import { FEE_TYPES, fee } from '../test-support/builders.js'
import { validateBatchFees } from './batch-fees.js'

// Spec settlement "Fees por batch prellenados" (design D13): preset of the account, free amount with its category,
// the Other Fees exception (P7), validity at the batch reference date (P8), the percentage-only preset (P9).
const monthly = fee({ feeTypeId: 111, fixedAmount: '250.0000' })
const overOnePercent = fee({ feeTypeId: 105, percentage: '0.010000' })
const mdr = fee({ feeTypeId: 1, percentage: '0.100000' })
const ctx = {
  feeTypes: FEE_TYPES,
  fees: [monthly, overOnePercent, mdr],
  prefilledFeeTypeIds: new Set([121, 117]),
  referenceDay: '2026-10-24',
}

describe('valid batch fees', () => {
  it('keeps the order of the request and sums otherFeeAmt (a negative adjustment included)', () => {
    const result = validateBatchFees(
      [
        { feeTypeId: 111, feeId: monthly.feeId, amount: '150', description: 'Monthly fee (preset)', source: 'manual' },
        { feeTypeId: 121, feeId: null, amount: '25.0000', description: 'Wire Fee', source: 'file' },
        { feeTypeId: 119, feeId: null, amount: '-42.5', description: '  Duplicate in batch 115  ', source: 'manual' },
      ],
      ctx,
    )

    expect(result).toEqual({
      ok: true,
      otherFeeAmt: '132.5000',
      fees: [
        {
          feeTypeId: 111,
          code: 'Monthly Fee',
          title: 'Monthly Fee',
          feeId: monthly.feeId,
          amount: '150.0000',
          description: 'Monthly fee (preset)',
          source: 'manual',
        },
        {
          feeTypeId: 121,
          code: 'Wire Fee',
          title: 'Wire Fee',
          feeId: null,
          amount: '25.0000',
          description: 'Wire Fee',
          source: 'file',
        },
        {
          feeTypeId: 119,
          code: 'Special Adjustment',
          title: 'Special Adjustment',
          feeId: null,
          amount: '-42.5000',
          description: 'Duplicate in batch 115',
          source: 'manual',
        },
      ],
    })
  })

  it('admits a pre-filled fee of a type without free amount and without a preset (P7: Wire Fee in batch-clean)', () => {
    const result = validateBatchFees([{ feeTypeId: 117, feeId: null, amount: '15', source: 'file' }], ctx)

    expect(result).toMatchObject({ ok: true, otherFeeAmt: '15.0000' })
  })

  it('takes a percentage-only preset with the amount the analyst writes (P9)', () => {
    const result = validateBatchFees(
      [{ feeTypeId: 105, feeId: overOnePercent.feeId, amount: '87.1200', source: 'manual' }],
      ctx,
    )

    expect(result).toMatchObject({ ok: true, fees: [{ feeId: overOnePercent.feeId, amount: '87.1200' }] })
  })

  it('without batch fees, otherFeeAmt is 0', () => {
    expect(validateBatchFees([], ctx)).toEqual({ ok: true, fees: [], otherFeeAmt: '0.0000' })
  })
})

describe('invalid batch fees: the first one that fails, by its position', () => {
  const reasonOf = (fees: Parameters<typeof validateBatchFees>[0], context = ctx) => validateBatchFees(fees, context)

  it('unknown_fee_type and transactional_fee_type', () => {
    expect(reasonOf([{ feeTypeId: 999, feeId: null, amount: '1', source: 'manual', description: 'x' }])).toEqual({
      ok: false,
      index: 0,
      reason: 'unknown_fee_type',
    })
    expect(reasonOf([{ feeTypeId: 1, feeId: mdr.feeId, amount: '1', source: 'manual' }])).toEqual({
      ok: false,
      index: 0,
      reason: 'transactional_fee_type',
    })
  })

  it('fee_not_in_account and fee_type_mismatch', () => {
    const other = 'fe000000-0000-4000-8000-00000000ffff'
    expect(reasonOf([{ feeTypeId: 111, feeId: other, amount: '1', source: 'manual' }])).toMatchObject({
      reason: 'fee_not_in_account',
    })
    expect(reasonOf([{ feeTypeId: 121, feeId: monthly.feeId, amount: '1', source: 'manual' }])).toMatchObject({
      reason: 'fee_type_mismatch',
    })
  })

  it('fee_not_in_force at the reference day of the batch (settlementDate, or the max of the ranges)', () => {
    const closed = fee({ feeTypeId: 111, feeId: 'fe000000-0000-4000-8000-000000000999', endDate: '2026-10-15' })
    const fees = [{ feeTypeId: 111, feeId: closed.feeId, amount: '1', source: 'manual' as const }]

    expect(reasonOf(fees, { ...ctx, fees: [closed] })).toMatchObject({ reason: 'fee_not_in_force' })
    expect(reasonOf(fees, { ...ctx, fees: [closed], referenceDay: '2026-10-10' })).toMatchObject({ ok: true })
  })

  it('free_amount_not_allowed: a manual free amount of a type without allowsFreeAmount, or a file one of a type not pre-filled', () => {
    expect(reasonOf([{ feeTypeId: 121, feeId: null, amount: '1', source: 'manual', description: 'x' }])).toMatchObject({
      reason: 'free_amount_not_allowed',
    })
    expect(reasonOf([{ feeTypeId: 111, feeId: null, amount: '1', source: 'file' }])).toMatchObject({
      reason: 'free_amount_not_allowed',
    })
  })

  it('description_required: a manual free amount without description or with blanks only', () => {
    for (const description of [undefined, '', '   '])
      expect(
        reasonOf([
          { feeTypeId: 111, feeId: monthly.feeId, amount: '1', source: 'manual' },
          { feeTypeId: 119, feeId: null, amount: '-1', source: 'manual', description },
        ]),
      ).toEqual({ ok: false, index: 1, reason: 'description_required' })
  })

  it('a zero amount is rejected by the request schema, not here: the domain keeps the sign it receives', () => {
    expect(
      reasonOf([{ feeTypeId: 119, feeId: null, amount: '-0.0001', source: 'manual', description: 'x' }]),
    ).toMatchObject({ ok: true, otherFeeAmt: '-0.0001' })
  })
})
