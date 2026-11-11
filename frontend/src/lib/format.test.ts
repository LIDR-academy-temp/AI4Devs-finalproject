import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  auditInstant,
  businessDate,
  canonicalDecimal,
  DISPLAY_TIME_ZONE,
  formatAuditDate,
  formatAuditDateTime,
  formatBusinessDate,
  formatBusinessDateTime,
  formatDecimal,
  newYorkToday,
  percentError,
  percentToRate,
  rateToPercent,
} from './format'

// A process zone that is neither New York nor UTC: the formatters must not depend on it (design D11).
process.env.TZ = 'Asia/Tokyo'

describe('formatDecimal', () => {
  it.each([
    ['50000.0000', '50,000.0000'],
    ['0.0000', '0.0000'],
    ['1234567.5', '1,234,567.5'],
    ['-1500.25', '-1,500.25'],
    ['999', '999'],
    ['12345678901234567.8901', '12,345,678,901,234,567.8901'],
  ])('groups the integer part of %s without going through a JS number', (input, expected) => {
    expect(formatDecimal(input)).toBe(expected)
  })
})

describe('canonicalDecimal (web-admin-accounts design D5)', () => {
  it.each([
    ['50000', '50000'],
    ['50000.0000', '50000'],
    ['015.10', '15.1'],
    ['0', '0'],
    ['0.0000', '0'],
    ['-12.500', '-12.5'],
  ])('%s is the same amount as %s', (value, canonical) => {
    expect(canonicalDecimal(value)).toBe(canonical)
  })

  it('keeps null as null', () => {
    expect(canonicalDecimal(null)).toBeNull()
  })
})

describe('dates shown in New York time (design D11)', () => {
  it('shows New York', () => {
    expect(DISPLAY_TIME_ZONE).toBe('America/New_York')
  })

  it('shows a business date as it arrives: it is already New York wall-clock time, without a zone', () => {
    const value = businessDate('2026-09-28T00:04:11')
    expect(formatBusinessDateTime(value)).toBe('2026-09-28 00:04 ET')
    expect(formatBusinessDate(value)).toBe('2026-09-28')
  })

  it('shows a day alone as it arrives', () => {
    expect(formatBusinessDate(businessDate('2026-10-24'))).toBe('2026-10-24')
  })

  describe('with the process in another zone (business-dates-no-z D5)', () => {
    const original = process.env.TZ
    beforeEach(() => {
      process.env.TZ = 'Asia/Tokyo'
    })
    afterEach(() => {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    })

    it('does not move a business date', () => {
      const value = businessDate('2026-09-28T00:04:11')
      expect(formatBusinessDateTime(value)).toBe('2026-09-28 00:04 ET')
      expect(formatBusinessDate(value)).toBe('2026-09-28')
      expect(formatBusinessDateTime(businessDate('2026-10-07T23:58:40'))).toBe('2026-10-07 23:58 ET')
    })
  })

  it('converts an audit instant to New York daylight time (EDT, -4 h)', () => {
    expect(formatAuditDateTime(auditInstant('2026-10-18T14:20:00.000Z'))).toBe('2026-10-18 10:20 ET')
  })

  it('converts an audit instant to New York standard time after the change of 1 Nov 2026 (EST, -5 h)', () => {
    expect(formatAuditDateTime(auditInstant('2026-11-02T15:00:00.000Z'))).toBe('2026-11-02 10:00 ET')
  })

  it('gives the New York day of an audit instant', () => {
    expect(formatAuditDate(auditInstant('2026-11-04T03:30:00.000Z'))).toBe('2026-11-03')
    expect(formatAuditDate(auditInstant('2026-11-04T05:00:00.000Z'))).toBe('2026-11-04')
  })

  it('does not accept one kind of date in the formatter of the other', () => {
    const audit = auditInstant('2026-10-18T14:20:00.000Z')
    const business = businessDate('2026-09-28T00:00:00')
    // @ts-expect-error an audit instant is not a business date
    formatBusinessDateTime(audit)
    // @ts-expect-error a business date is not an audit instant
    formatAuditDateTime(business)
    // @ts-expect-error a plain string is neither
    formatBusinessDate('2026-09-28T00:00:00')
  })
})

// web-admin-fees design D5: only the default end date of Close…; the API sets the limit.
describe('newYorkToday', () => {
  it.each([
    ['2026-11-04T03:30:00.000Z', '2026-11-03', '22:30 in New York is still the 3rd, already the 4th in UTC'],
    ['2026-11-04T05:00:00.000Z', '2026-11-04', 'midnight in New York (EST, -5 h)'],
    ['2026-11-04T04:59:59.000Z', '2026-11-03', 'one second before midnight in New York'],
    ['2026-03-08T04:30:00.000Z', '2026-03-07', 'the night daylight saving starts (EST until 07:00 UTC)'],
    ['2026-03-09T03:59:00.000Z', '2026-03-08', 'the day after daylight saving starts (EDT, -4 h)'],
    ['2026-11-01T04:30:00.000Z', '2026-11-01', 'the night daylight saving ends (still EDT at 04:30 UTC)'],
  ])('%s is %s (%s)', (instant, expected) => {
    expect(newYorkToday(new Date(instant))).toBe(expected)
  })
})

// web-admin-fees design D6: a percentage as the user writes it ⇄ the fraction the API takes, as text.
describe('percentToRate', () => {
  it.each([
    ['2.75', '0.027500'],
    ['2.9', '0.029000'],
    ['0', '0.000000'],
    ['100', '1.000000'],
    ['0.0001', '0.000001'],
    ['10', '0.100000'],
    ['002.50', '0.025000'],
    [' 3.1 ', '0.031000'],
  ])('%s %% is %s', (percent, rate) => {
    expect(percentToRate(percent)).toBe(rate)
  })

  it('refuses what percentError refuses', () => {
    expect(() => percentToRate('2.75001')).toThrow()
    expect(() => percentToRate('101')).toThrow()
  })
})

describe('rateToPercent', () => {
  it.each([
    ['0.027500', '2.75'],
    ['0.029000', '2.9'],
    ['0.000000', '0'],
    ['1.000000', '100'],
    ['0.000001', '0.0001'],
    ['0.1', '10'],
    ['0.10', '10'],
  ])('%s is %s %%', (rate, percent) => {
    expect(rateToPercent(rate)).toBe(percent)
  })
})

describe('percentError', () => {
  it.each(['0', '2.75', '100', '100.0000', '0.0001', '0100', '099.9999', '00'])('accepts %s', (value) => {
    expect(percentError(value)).toBeNull()
  })

  it.each(['2.75001', '0.00001'])('refuses %s: more than 4 decimals in percent (6 as a fraction)', (value) => {
    expect(percentError(value)).toBe('too_precise')
  })

  it.each(['100.0001', '101', '250', '0101', '1000', '999.9'])('refuses %s: above 100 %%', (value) => {
    expect(percentError(value)).toBe('out_of_range')
  })

  it.each(['-1', 'abc', '2,75', '1e2', '.5', ''])('refuses %s: not a percentage', (value) => {
    expect(percentError(value)).toBe('invalid')
  })
})
