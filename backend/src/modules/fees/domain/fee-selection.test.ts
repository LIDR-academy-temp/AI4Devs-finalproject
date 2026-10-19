import { describe, expect, it } from 'vitest'
import { businessDay, feeInForce, isInForce } from './fee-selection.js'

// Spec fees "Selección por fecha de evento" (README §3.2 Fee): NULL is ±∞, both ends inclusive, and the day is the
// business date of the event (New York wall time stored without zone), never the current time.
const always = { startDate: null, endDate: null }

describe('isInForce', () => {
  it('NULL…NULL is in force on any day', () => {
    expect(isInForce(always, '0001-01-01')).toBe(true)
    expect(isInForce(always, '9999-12-31')).toBe(true)
  })

  it('an open start means since forever and an open end means no end', () => {
    expect(isInForce({ startDate: null, endDate: '2026-10-31' }, '1990-01-01')).toBe(true)
    expect(isInForce({ startDate: '2026-11-01', endDate: null }, '2099-01-01')).toBe(true)
  })

  it('both ends are inclusive', () => {
    const october = { startDate: '2026-10-01', endDate: '2026-10-31' }
    expect(isInForce(october, '2026-10-01')).toBe(true)
    expect(isInForce(october, '2026-10-31')).toBe(true)
    expect(isInForce(october, '2026-09-30')).toBe(false)
    expect(isInForce(october, '2026-11-01')).toBe(false)
  })
})

describe('businessDay', () => {
  it('takes the day of a business date as stored, without converting zones', () => {
    // The adapter reads a datetime2 wall time as if it were UTC: its day is the ISO date part.
    expect(businessDay(new Date('2026-10-31T23:59:59.000Z'))).toBe('2026-10-31')
    expect(businessDay(new Date('2026-11-01T00:00:00.000Z'))).toBe('2026-11-01')
  })

  it('the last instant of the end day is still in force', () => {
    const until = { startDate: null, endDate: '2026-10-31' }
    expect(isInForce(until, businessDay(new Date('2026-10-31T23:59:59.999Z')))).toBe(true)
  })
})

describe('feeInForce', () => {
  const chain = [
    { feeId: 'old', feeTypeId: 4, startDate: null, endDate: '2026-10-31' },
    { feeId: 'new', feeTypeId: 4, startDate: '2026-11-01', endDate: null },
    { feeId: 'refund', feeTypeId: 5, startDate: null, endDate: null },
  ]

  it('picks the fee of the type in force at the event day, not at the batch day (spec scenario)', () => {
    expect(feeInForce(chain, 4, '2026-10-15')?.feeId).toBe('old')
    expect(feeInForce(chain, 4, '2026-11-01')?.feeId).toBe('new')
  })

  it('answers null when no fee of the type is in force', () => {
    expect(feeInForce(chain, 6, '2026-10-15')).toBeNull()
    expect(feeInForce([{ feeId: 'x', feeTypeId: 4, startDate: '2026-11-01', endDate: null }], 4, '2026-10-15')).toBe(
      null,
    )
  })
})
