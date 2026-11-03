import { describe, expect, it } from 'vitest'
import { likeLiteral } from './prisma-fee-query-repository.js'

// Spec fees "Filtros de la vista global": q is a literal text, never a LIKE pattern.
describe('likeLiteral', () => {
  it('puts the LIKE wildcards of SQL Server between brackets', () => {
    expect(likeLiteral('%')).toBe('[%]')
    expect(likeLiteral('_')).toBe('[_]')
    expect(likeLiteral('[a-z]')).toBe('[[]a-z]')
    expect(likeLiteral('50% off_x')).toBe('50[%] off[_]x')
  })

  it('leaves ordinary text as it is', () => {
    expect(likeLiteral('Chargeback over 1')).toBe('Chargeback over 1')
    expect(likeLiteral('TRX Fee - Deposit')).toBe('TRX Fee - Deposit')
  })
})
