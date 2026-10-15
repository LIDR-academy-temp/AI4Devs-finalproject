import { describe, expect, it } from 'vitest'
import { IntId } from './vocabulary.js'

describe('IntId', () => {
  it('coerces a path segment to a positive integer', () => {
    expect(IntId.parse('101')).toBe(101)
  })

  it('accepts the largest value of an INT column', () => {
    expect(IntId.parse('2147483647')).toBe(2_147_483_647)
  })

  it.each(['2147483648', '99999999999', '0', '-1', '1.5', 'abc', '1e3', '0x10', ' 12'])('rejects %s', (value) => {
    expect(IntId.safeParse(value).success).toBe(false)
  })
})
