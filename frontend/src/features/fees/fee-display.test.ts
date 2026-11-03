import { describe, expect, it } from 'vitest'
import {
  feeAppliesTo,
  formatFeeValue,
  formatRate,
  formatValidFrom,
  formatValidity,
  formatValidTo,
  shiftDay,
} from './fee-display'

// Spec fees "Pantalla Fees: columnas y orden" (web-admin-fees design D6): values as text, never through a JS number.
describe('formatRate', () => {
  it.each([
    ['0.029000', '2.900 %'],
    ['0.027500', '2.750 %'],
    ['0.100000', '10.000 %'],
    ['1.000000', '100.000 %'],
    ['0.000001', '0.0001 %'],
    ['0.000000', '0.000 %'],
  ])('%s shows as %s', (rate, shown) => {
    expect(formatRate(rate)).toBe(shown)
  })
})

describe('formatFeeValue', () => {
  it('a fixed amount with its four decimals and grouping', () => {
    expect(formatFeeValue({ fixedAmount: '1250.0000', percentage: null })).toBe('1,250.0000')
  })

  it('a percentage', () => {
    expect(formatFeeValue({ fixedAmount: null, percentage: '0.029000' })).toBe('2.900 %')
  })

  it('both', () => {
    expect(formatFeeValue({ fixedAmount: '0.1200', percentage: '0.029000' })).toBe('0.1200 + 2.900 %')
  })
})

describe('validity', () => {
  it('null start is always, null end is open', () => {
    expect(formatValidFrom(null)).toBe('always')
    expect(formatValidTo(null)).toBe('open')
    expect(formatValidity(null, null)).toBe('always → open')
  })

  it('days as they arrive', () => {
    expect(formatValidFrom('2026-01-01')).toBe('2026-01-01')
    expect(formatValidTo('2026-10-31')).toBe('2026-10-31')
    expect(formatValidity('2026-01-01', null)).toBe('2026-01-01 → open')
  })
})

describe('shiftDay', () => {
  it.each([
    ['2026-11-01', -1, '2026-10-31'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2027-03-01', -1, '2027-02-28'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2026-10-15', 1, '2026-10-16'],
  ] as const)('%s %s day is %s, on the civil date', (day, days, expected) => {
    expect(shiftDay(day, days)).toBe(expected)
  })
})

describe('feeAppliesTo', () => {
  const types = [
    { feeTypeId: 1, isTransactional: true, appliesToStatusId: 2, allowsFreeAmount: false },
    { feeTypeId: 3, isTransactional: true, appliesToStatusId: 3, allowsFreeAmount: false },
    { feeTypeId: 4, isTransactional: true, appliesToStatusId: 4, allowsFreeAmount: false },
    { feeTypeId: 111, isTransactional: false, appliesToStatusId: null, allowsFreeAmount: false },
    { feeTypeId: 119, isTransactional: false, appliesToStatusId: null, allowsFreeAmount: true },
  ]

  it.each([
    [1, 'E · Successful'],
    [3, 'E · Declined'],
    [4, 'I · Chargeback'],
    [111, 'batch · preset'],
    [119, 'batch · free amount'],
  ])('fee type %s applies to %s', (feeTypeId, expected) => {
    expect(feeAppliesTo(feeTypeId, types)).toBe(expected)
  })

  it('a type the catalog does not list yet shows nothing', () => {
    expect(feeAppliesTo(999, types)).toBe('—')
    expect(feeAppliesTo(1, undefined)).toBe('—')
  })
})
