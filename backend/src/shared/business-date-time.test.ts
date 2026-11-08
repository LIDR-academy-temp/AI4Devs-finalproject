import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { businessDateTime } from './business-date-time.js'

// business-dates-no-z D3: Prisma reads a DATETIME2 as a Date whose UTC digits are the stored ones, so the business
// date leaves with those digits, without a zone or milliseconds, whatever the process zone.
describe('businessDateTime', () => {
  it('keeps the stored digits without Z or milliseconds', () => {
    expect(businessDateTime(new Date('2026-09-28T00:04:11.000Z'))).toBe('2026-09-28T00:04:11')
  })

  it('truncates a fraction of a second', () => {
    expect(businessDateTime(new Date('2026-10-07T23:58:40.999Z'))).toBe('2026-10-07T23:58:40')
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

    // The CI runs in UTC, where local getters (getHours()…) give the UTC digits too: only this case catches them.
    it('does not move the date (local getters would)', () => {
      expect(businessDateTime(new Date('2026-09-28T00:04:11.000Z'))).toBe('2026-09-28T00:04:11')
    })
  })
})
