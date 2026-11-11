import { FeeSnapshot } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import type { FeeState } from './fee-patch.js'
import { readSnapshot, snapshotJson, toSnapshot } from './fee-snapshot.js'

// Spec fees "Historial", "Historial de un fee por API" (admin-fees design D10).
const state: FeeState = {
  feeId: 'fee-1',
  feeTypeId: 4,
  fixedAmount: '45.0000',
  percentage: null,
  conditionalPercentage: null,
  conditionThresholdAmt: null,
  brandFixedAmount: null,
  brandPercentage: null,
  startDate: null,
  endDate: '2026-10-31',
  description: 'Chargeback',
}

describe('toSnapshot and snapshotJson', () => {
  it('keeps the configuration in API form, without the fee id', () => {
    const snapshot = toSnapshot(state)

    expect(FeeSnapshot.parse(snapshot)).toEqual(snapshot)
    expect(snapshot).not.toHaveProperty('feeId')
    expect(JSON.parse(snapshotJson(state))).toEqual(snapshot)
  })

  it('reads back what it writes', () => {
    expect(readSnapshot(snapshotJson(state))).toEqual(toSnapshot(state))
  })
})

describe('readSnapshot', () => {
  it('reads the seed history, with JSON numbers, as decimal strings', () => {
    const seed = JSON.stringify({
      feeId: 'f',
      accountId: 'a',
      feeTypeId: 1,
      fixedAmount: null,
      percentage: 0.1,
      conditionalPercentage: null,
      conditionThresholdAmt: null,
      startDate: null,
      endDate: null,
      createdByUserId: 1,
    })

    expect(readSnapshot(seed)).toEqual({
      feeTypeId: 1,
      fixedAmount: null,
      percentage: '0.100000',
      conditionalPercentage: null,
      conditionThresholdAmt: null,
      brandFixedAmount: null,
      brandPercentage: null,
      startDate: null,
      endDate: null,
      description: null,
    })
  })

  it('normalizes seeded amounts and conditional percentages', () => {
    const snapshot = readSnapshot(
      JSON.stringify({
        feeTypeId: 105,
        fixedAmount: 0.65,
        percentage: 0.01,
        conditionalPercentage: 0.02,
        conditionThresholdAmt: 0.01,
      }),
    )
    expect(snapshot).toMatchObject({
      fixedAmount: '0.6500',
      percentage: '0.010000',
      conditionalPercentage: '0.020000',
      conditionThresholdAmt: '0.0100',
    })
  })

  it('takes a date stored as an ISO instant by its day', () => {
    expect(
      readSnapshot(JSON.stringify({ feeTypeId: 1, fixedAmount: 1, startDate: '2026-11-01T00:00:00.000Z' })).startDate,
    ).toBe('2026-11-01')
  })
})
