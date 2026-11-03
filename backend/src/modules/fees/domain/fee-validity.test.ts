import { describe, expect, it } from 'vitest'
import { newYorkDay, statusOf } from './fee-validity.js'

// Spec fees "Estado de un fee" (admin-fees design D7).
describe('statusOf', () => {
  const today = '2026-11-03'

  it('is scheduled, closed or active against today', () => {
    expect(statusOf({ startDate: '2026-11-04', endDate: null }, today)).toBe('scheduled')
    expect(statusOf({ startDate: null, endDate: '2026-11-02' }, today)).toBe('closed')
    expect(statusOf({ startDate: null, endDate: '2026-11-03' }, today)).toBe('active')
  })

  it('counts both ends of the validity as in force', () => {
    expect(statusOf({ startDate: '2026-11-03', endDate: '2026-11-03' }, today)).toBe('active')
    expect(statusOf({ startDate: null, endDate: null }, today)).toBe('active')
  })
})

describe('newYorkDay', () => {
  it('is the calendar day in New York, not in UTC', () => {
    // 03:30 UTC on 4 Nov is still 3 Nov in New York (EST, UTC−5).
    expect(newYorkDay(new Date('2026-11-04T03:30:00Z'))).toBe('2026-11-03')
    expect(newYorkDay(new Date('2026-11-04T05:30:00Z'))).toBe('2026-11-04')
  })

  it('follows daylight saving time', () => {
    // 03:30 UTC on 15 Jul is 23:30 EDT (UTC−4) on 14 Jul.
    expect(newYorkDay(new Date('2026-07-15T03:30:00Z'))).toBe('2026-07-14')
    expect(newYorkDay(new Date('2026-07-15T04:30:00Z'))).toBe('2026-07-15')
  })
})
