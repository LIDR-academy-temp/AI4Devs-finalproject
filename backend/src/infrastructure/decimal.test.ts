import { Money, Percentage } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { Prisma } from '../generated/prisma/client.js'
import { toMoney, toPercentage } from './decimal.js'

describe('toMoney', () => {
  it.each([
    { input: '50000', expected: '50000.0000' },
    { input: '0.65', expected: '0.6500' },
    { input: '-12.5', expected: '-12.5000' },
    { input: '1234567890123.1234', expected: '1234567890123.1234' },
  ])('formats $input as $expected with four decimals', ({ input, expected }) => {
    const value = toMoney(new Prisma.Decimal(input))

    expect(value).toBe(expected)
    expect(Money.safeParse(value).success).toBe(true)
  })

  it('keeps null as null', () => {
    expect(toMoney(null)).toBeNull()
  })

  it('returns a string, never a number', () => {
    expect(typeof toMoney(new Prisma.Decimal('1'))).toBe('string')
  })
})

describe('toPercentage', () => {
  it.each([
    { input: '0.1', expected: '0.100000' },
    { input: '0.05', expected: '0.050000' },
    { input: '0', expected: '0.000000' },
    { input: '1', expected: '1.000000' },
    { input: '0.025', expected: '0.025000' },
  ])('formats $input as $expected with six decimals', ({ input, expected }) => {
    const value = toPercentage(new Prisma.Decimal(input))

    expect(value).toBe(expected)
    expect(Percentage.safeParse(value).success).toBe(true)
  })

  it('keeps null as null', () => {
    expect(toPercentage(null)).toBeNull()
  })
})
