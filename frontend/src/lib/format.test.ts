import { describe, expect, it } from 'vitest'
import {
  auditInstant,
  businessDate,
  DISPLAY_TIME_ZONE,
  formatAuditDateTime,
  formatBusinessDate,
  formatBusinessDateTime,
  formatDecimal,
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

describe('dates shown in New York time (design D11)', () => {
  it('shows New York', () => {
    expect(DISPLAY_TIME_ZONE).toBe('America/New_York')
  })

  it('shows a business date as it arrives: it is already New York wall-clock time despite the Z', () => {
    const value = businessDate('2026-09-28T00:00:00.000Z')
    expect(formatBusinessDateTime(value)).toBe('2026-09-28 00:00 ET')
    expect(formatBusinessDate(value)).toBe('2026-09-28 ET')
  })

  it('converts an audit instant to New York daylight time (EDT, -4 h)', () => {
    expect(formatAuditDateTime(auditInstant('2026-10-18T14:20:00.000Z'))).toBe('2026-10-18 10:20 ET')
  })

  it('converts an audit instant to New York standard time after the change of 1 Nov 2026 (EST, -5 h)', () => {
    expect(formatAuditDateTime(auditInstant('2026-11-02T15:00:00.000Z'))).toBe('2026-11-02 10:00 ET')
  })

  it('does not accept one kind of date in the formatter of the other', () => {
    const audit = auditInstant('2026-10-18T14:20:00.000Z')
    const business = businessDate('2026-09-28T00:00:00.000Z')
    // @ts-expect-error an audit instant is not a business date
    formatBusinessDateTime(audit)
    // @ts-expect-error a business date is not an audit instant
    formatAuditDateTime(business)
    // @ts-expect-error a plain string is neither
    formatBusinessDate('2026-09-28T00:00:00.000Z')
  })
})
