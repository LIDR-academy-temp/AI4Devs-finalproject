import { describe, expect, it } from 'vitest'
import { auditTime } from './audit-time.js'

// Spec settlement "Summary del merchant", scenario "Fechas del summary": processedAt is a UTC instant shown in New York
// time with an ET suffix, daylight saving included (design D7).
describe('auditTime', () => {
  it('converts an instant in daylight saving time (EDT, UTC−4)', () => {
    expect(auditTime('2026-10-19T15:40:03.120Z')).toBe('2026-10-19 11:40:03 ET')
  })

  it('converts an instant in standard time (EST, UTC−5)', () => {
    expect(auditTime('2026-12-15T15:40:03.000Z')).toBe('2026-12-15 10:40:03 ET')
  })

  it('moves to the previous New York day when UTC is past midnight', () => {
    expect(auditTime('2026-10-20T02:05:09.000Z')).toBe('2026-10-19 22:05:09 ET')
  })

  it('writes midnight as 00, not 24', () => {
    expect(auditTime('2026-10-20T04:00:00.000Z')).toBe('2026-10-20 00:00:00 ET')
  })

  it('accepts a Date', () => {
    expect(auditTime(new Date('2026-10-19T15:40:03.120Z'))).toBe('2026-10-19 11:40:03 ET')
  })
})
