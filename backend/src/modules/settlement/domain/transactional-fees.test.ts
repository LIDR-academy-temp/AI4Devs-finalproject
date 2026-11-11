import { describe, expect, it } from 'vitest'
import { FEE_TYPES, fee, movement } from '../test-support/builders.js'
import { applyTransactionalFees } from './transactional-fees.js'

// Spec fees "Selección por fecha de evento" (design D10, D4; P1, P6b): each transactional type whose status is the
// movement's adds a detail row with the fee in force at the business day of the event.
const types = [
  ...FEE_TYPES,
  {
    feeTypeId: 3,
    code: 'TRX Fee - Decline',
    title: 'Decline fee',
    isTransactional: true,
    appliesToStatusCode: 'Declined' as const,
    allowsFreeAmount: false,
  },
]
const mdr = fee({ feeTypeId: 1, feeId: 'fe000000-0000-4000-8000-000000000001', percentage: '0.100000' })
const deposit = fee({ feeTypeId: 2, feeId: 'fe000000-0000-4000-8000-000000000002', fixedAmount: '0.6500' })
const decline = fee({ feeTypeId: 3, feeId: 'fe000000-0000-4000-8000-000000000003', fixedAmount: '0.2500' })
const chargebackOld = fee({
  feeTypeId: 4,
  feeId: 'fe000000-0000-4000-8000-000000000041',
  fixedAmount: '40.0000',
  endDate: '2026-10-31',
})
const chargebackNew = fee({
  feeTypeId: 4,
  feeId: 'fe000000-0000-4000-8000-000000000042',
  fixedAmount: '45.0000',
  startDate: '2026-11-01',
})
const all = [mdr, deposit, decline, chargebackOld, chargebackNew]
const apply = (movements: Parameters<typeof applyTransactionalFees>[0], fees = all) =>
  applyTransactionalFees(movements, { fees, feeTypes: types })

describe('applyTransactionalFees', () => {
  it('an approved gets MDR and the deposit fee, each with its row and configuration (100 → 10.0000 + 0.6500)', () => {
    const [m] = apply([movement(2, { gatewayAmount: '100.0000' })]).movements

    expect(m!.feeAmount).toBe('10.6500')
    expect(m!.fees.map((f) => [f.code, f.feeId, f.amount, f.percentage])).toEqual([
      ['MDR', mdr.feeId, '10.0000', '0.100000'],
      ['TRX Fee - Deposit', deposit.feeId, '0.6500', null],
    ])
    expect(JSON.parse(m!.fees[0]!.configurationSnapshot)).toMatchObject({
      base: '100.0000',
      day: '2026-09-30',
      fee: { feeId: mdr.feeId, percentage: '0.100000', fixedAmount: null, startDate: null, endDate: null },
    })
  })

  it('keeps 4 decimals and rounds a tie in the fifth half up (12.3445 → MDR 1.2345)', () => {
    const [m] = apply([movement(2, { gatewayAmount: '12.3445' })], [mdr]).movements

    expect(m!.fees[0]!.amount).toBe('1.2345')
  })

  it('a declined is charged on the gateway amount though its movement amount is 0', () => {
    const [m] = apply([movement(2, { statusCode: 'Declined', amount: '0.0000', gatewayAmount: '80.0000' })]).movements

    expect(m!.fees.map((f) => [f.code, f.amount])).toEqual([['TRX Fee - Decline', '0.2500']])
  })

  it('picks the fee in force at the event day, not at the batch day; a CHB 2 gets the Chargeback fee too', () => {
    const october = new Date('2026-10-15T12:00:00.000Z')
    const november = new Date('2026-11-01T00:00:00.000Z')
    const { movements } = apply([
      movement(2, { cycle: 'I', statusCode: 'Chargeback', eventDate: october }),
      movement(3, { cycle: 'I', statusCode: 'Chargeback', eventDate: november, excludeAmount: true }),
    ])

    expect(movements.map((m) => m.fees.map((f) => f.feeId))).toEqual([[chargebackOld.feeId], [chargebackNew.feeId]])
    expect(movements.map((m) => m.feeAmount)).toEqual(['40.0000', '45.0000'])
  })

  it('an R movement gets no fees', () => {
    expect(apply([movement(2, { cycle: 'R', statusCode: 'Successful' })]).movements[0]!.fees).toEqual([])
  })

  it('an undated adjustment gets the only NULL…NULL fee of its type (P6b)', () => {
    const always = fee({ feeTypeId: 4, feeId: 'fe000000-0000-4000-8000-000000000049', fixedAmount: '45.0000' })

    const { movements, skipped } = apply(
      [movement(2, { cycle: 'I', statusCode: 'Chargeback', eventDate: null })],
      [always],
    )

    expect(movements[0]!.fees.map((f) => f.feeId)).toEqual([always.feeId])
    expect(skipped).toEqual([])
  })

  it('an undated adjustment with dated fees of its type gets none and is reported as skipped (P6b)', () => {
    const { movements, skipped } = apply([movement(2, { cycle: 'I', statusCode: 'Chargeback', eventDate: null })])

    expect(movements[0]!.fees).toEqual([])
    expect(movements[0]!.feeAmount).toBe('0.0000')
    expect(skipped).toEqual([{ sheetId: movements[0]!.sheetId, rowNo: 2 }])
  })

  it('warns no_transactional_fees when the account has none', () => {
    const { warnings } = apply([movement(2)], [fee({ feeTypeId: 111, fixedAmount: '250.0000' })])

    expect(warnings).toEqual([{ code: 'no_transactional_fees' }])
  })

  it('warns fee_variant_not_applied once per fee with a conditional or brand variant', () => {
    const conditional = { ...mdr, conditionalPercentage: '0.020000', conditionThresholdAmt: '0.0100' }

    const { warnings, movements } = apply([movement(2), movement(3)], [conditional])

    expect(movements[0]!.fees[0]!.amount).toBe('10.0000')
    expect(warnings).toEqual([{ code: 'fee_variant_not_applied', feeId: conditional.feeId }])
  })
})
