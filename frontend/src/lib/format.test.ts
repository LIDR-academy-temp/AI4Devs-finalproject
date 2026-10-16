import { describe, expect, it } from 'vitest'
import { formatDecimal } from './format'

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
