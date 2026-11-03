import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { feeProblemOf } from './fee-errors'
import { strings } from './strings'

// web-admin-fees design D7 and spec fees "Pantalla Account Fees: errores del API".
const e = strings.form.errors
const FEE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

describe('feeProblemOf', () => {
  it('a domain 400 with details.field goes next to that field', () => {
    const error = new ApiError(400, 'validation_error', 'endDate must not be before startDate', { field: 'endDate' })
    expect(feeProblemOf(error, 'MDR')).toEqual({
      fields: { endDate: 'endDate must not be before startDate' },
      general: null,
      conflicts: [],
      refetch: false,
    })
  })

  it('fixedAmount marks the amount and the percentage: the rule is about both', () => {
    const error = new ApiError(400, 'validation_error', 'fixedAmount or percentage is required', {
      field: 'fixedAmount',
    })
    expect(feeProblemOf(error, 'MDR').fields).toEqual({
      fixedAmount: 'fixedAmount or percentage is required',
      percent: 'fixedAmount or percentage is required',
    })
  })

  it('a schema 400 (a list of issues) is a general message', () => {
    const error = new ApiError(400, 'validation_error', 'Invalid request', [{ path: 'percentage', message: 'bad' }])
    expect(feeProblemOf(error, 'MDR')).toMatchObject({ fields: {}, general: e.invalid('Invalid request') })
  })

  it('fee_overlap lists each conflict with its validity', () => {
    const error = new ApiError(409, 'fee_overlap', 'overlap', {
      conflicts: [
        { feeId: FEE, startDate: '2026-01-01', endDate: null },
        { feeId: FEE, startDate: null, endDate: '2025-12-31' },
      ],
    })
    expect(feeProblemOf(error, 'MDR')).toEqual({
      fields: {},
      general: e.overlap('MDR'),
      conflicts: ['2026-01-01 → open', 'always → 2025-12-31'],
      refetch: false,
    })
  })

  it('fee_overlap with details it cannot read still says it overlaps', () => {
    const error = new ApiError(409, 'fee_overlap', 'overlap', { conflicts: 'x' })
    expect(feeProblemOf(error, 'MDR')).toMatchObject({ general: e.overlap('MDR'), conflicts: [] })
  })

  it('fee_in_use with fields names them and asks the list again', () => {
    const error = new ApiError(409, 'fee_in_use', 'in use', { fields: ['percentage', 'startDate'] })
    expect(feeProblemOf(error, 'MDR')).toEqual({
      fields: {},
      general: e.inUseFields(['Percentage', 'Valid from']),
      conflicts: [],
      refetch: true,
    })
  })

  it('fee_in_use with lastAppliedEventDate says the earliest day and asks the list again', () => {
    const error = new ApiError(409, 'fee_in_use', 'in use', { lastAppliedEventDate: '2026-10-15' })
    expect(feeProblemOf(error, 'MDR')).toMatchObject({ general: e.appliedUpTo('2026-10-15'), refetch: true })
  })

  it('403, 404 and anything else', () => {
    expect(feeProblemOf(new ApiError(403, 'forbidden', 'Forbidden'), 'MDR')).toMatchObject({
      general: e.forbidden,
      refetch: false,
    })
    expect(feeProblemOf(new ApiError(404, 'not_found', 'Fee not found'), 'MDR')).toMatchObject({
      general: e.notFound,
      refetch: true,
    })
    expect(feeProblemOf(new TypeError('Failed to fetch'), 'MDR')).toMatchObject({ general: e.unknown })
  })
})
