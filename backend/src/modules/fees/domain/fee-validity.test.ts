import { describe, expect, it } from 'vitest'
import { findOverlaps, newYorkDay, previousDay, statusOf } from './fee-validity.js'

// Spec fees "Vigencia con NULL como infinito" (README §3.2: NULL as sentinels, both ends inclusive).
describe('findOverlaps', () => {
  const span = (feeId: string, startDate: string | null, endDate: string | null, feeTypeId = 1) => ({
    feeId,
    feeTypeId,
    startDate,
    endDate,
  })

  it('two NULL…NULL fees of the same type overlap', () => {
    expect(findOverlaps(span('b', null, null), [span('a', null, null)])).toEqual([span('a', null, null)])
  })

  it('an open start overlaps a closed range that reaches back far enough', () => {
    const existing = span('a', '2026-01-01', '2026-06-30')
    expect(findOverlaps(span('b', null, '2026-01-01'), [existing])).toEqual([existing])
    expect(findOverlaps(span('b', '2026-06-30', null), [existing])).toEqual([existing])
    expect(findOverlaps(span('b', '2026-03-01', '2026-03-31'), [existing])).toEqual([existing])
  })

  it('contiguous ranges do not overlap', () => {
    expect(findOverlaps(span('b', '2026-11-01', null), [span('a', null, '2026-10-31')])).toEqual([])
    expect(findOverlaps(span('b', null, '2026-10-31'), [span('a', '2026-11-01', null)])).toEqual([])
  })

  it('ignores other types and the fee itself', () => {
    expect(findOverlaps(span('b', null, null, 1), [span('a', null, null, 2)])).toEqual([])
    expect(findOverlaps(span('a', '2026-11-01', null), [span('a', null, null)])).toEqual([])
  })

  it('lists every conflict, in the given order', () => {
    const others = [span('a', null, '2026-03-31'), span('c', '2026-07-01', null), span('d', '2026-04-01', '2026-04-30')]
    expect(findOverlaps(span('b', '2026-03-15', '2026-07-15'), others).map((s) => s.feeId)).toEqual(['a', 'c', 'd'])
  })
})

describe('previousDay', () => {
  it('steps back one civil day across months, leap years and years', () => {
    expect(previousDay('2026-11-01')).toBe('2026-10-31')
    expect(previousDay('2026-03-01')).toBe('2026-02-28')
    expect(previousDay('2028-03-01')).toBe('2028-02-29')
    expect(previousDay('2027-01-01')).toBe('2026-12-31')
    expect(previousDay('2026-11-15')).toBe('2026-11-14')
  })

  it('keeps years 0001–0099 as they are, never as 19xx', () => {
    expect(previousDay('0050-06-01')).toBe('0050-05-31')
    expect(previousDay('0001-01-02')).toBe('0001-01-01')
    expect(previousDay('0100-01-01')).toBe('0099-12-31')
  })
})

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
