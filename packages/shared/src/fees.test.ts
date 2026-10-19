import { describe, expect, it } from 'vitest'
import { AccountFee, AccountFeesQuery, FeeTypeView } from './fees.js'

// Reads for Settlement Review (settlement-process, spec fees "Fees de la cuenta vigentes a una fecha").
describe('AccountFee', () => {
  const fee = {
    feeId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000005',
    feeTypeId: 111,
    code: 'Monthly Fee',
    title: 'Monthly Fee',
    isTransactional: false,
    fixedAmount: '250.0000',
    percentage: null,
    startDate: null,
    endDate: null,
    description: null,
  }

  it('parses a preset with open validity ("always")', () => {
    expect(AccountFee.safeParse(fee).success).toBe(true)
  })

  it('takes a percentage-only preset, without a computed amount (P9)', () => {
    expect(AccountFee.safeParse({ ...fee, fixedAmount: null, percentage: '0.010000' }).success).toBe(true)
  })

  it('rejects money as a JSON number and dates that are not YYYY-MM-DD', () => {
    expect(AccountFee.safeParse({ ...fee, fixedAmount: 250 }).success).toBe(false)
    expect(AccountFee.safeParse({ ...fee, startDate: '2026-11-01T00:00:00.000Z' }).success).toBe(false)
  })
})

describe('AccountFeesQuery', () => {
  it('reads transactional as true or false and asOf as a business date', () => {
    expect(AccountFeesQuery.parse({ transactional: 'false', asOf: '2026-10-15' })).toEqual({
      transactional: false,
      asOf: '2026-10-15',
    })
    expect(AccountFeesQuery.parse({})).toEqual({})
  })

  it('rejects other values', () => {
    expect(AccountFeesQuery.safeParse({ transactional: 'no' }).success).toBe(false)
    expect(AccountFeesQuery.safeParse({ asOf: '15/10/2026' }).success).toBe(false)
  })
})

describe('FeeTypeView', () => {
  it('parses a free-amount category', () => {
    expect(
      FeeTypeView.safeParse({
        feeTypeId: 119,
        code: 'Special Adjustment',
        title: 'Special Adjustment',
        isTransactional: false,
        appliesToStatusId: null,
        allowsFreeAmount: true,
      }).success,
    ).toBe(true)
  })
})
