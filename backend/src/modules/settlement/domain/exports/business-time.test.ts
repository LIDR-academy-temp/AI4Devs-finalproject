import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { businessTime } from './business-time.js'

// Spec settlement "Summary del merchant", scenario "Fechas del summary", and "Fechas de los CSV del summary
// independientes de la zona del servidor": business dates are New York wall time without a zone, written as they
// arrive (business-dates-no-z D4).
describe('businessTime', () => {
  it('writes the digits as they arrive', () => {
    expect(businessTime('2026-10-07T23:58:40')).toBe('2026-10-07 23:58:40')
  })

  it('does not move a date near midnight to another day', () => {
    expect(businessTime('2026-09-28T00:04:11')).toBe('2026-09-28 00:04:11')
  })

  it('does not apply the daylight saving offset in winter either', () => {
    expect(businessTime('2026-12-15T15:40:03')).toBe('2026-12-15 15:40:03')
  })

  describe('with the API process outside UTC', () => {
    const original = process.env.TZ
    beforeEach(() => {
      process.env.TZ = 'America/New_York'
    })
    afterEach(() => {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    })

    it('still writes the stored digits', () => {
      expect(businessTime('2026-10-07T23:58:40')).toBe('2026-10-07 23:58:40')
      expect(businessTime('2026-09-28T00:04:11')).toBe('2026-09-28 00:04:11')
    })
  })
})
