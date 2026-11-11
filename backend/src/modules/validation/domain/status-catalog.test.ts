import { describe, expect, it } from 'vitest'
import { STATUS, STATUSES } from '../test-support/builders.js'
import { createStatusCatalog } from './status-catalog.js'

// The engine receives the status catalog as input (design D2, D11); natural cycle per README §3.3.
describe('createStatusCatalog', () => {
  const catalog = createStatusCatalog(STATUSES)

  it('gives the natural cycle of the six statuses of the synthetic catalog', () => {
    expect(catalog.naturalCycle(STATUS.Pending)).toBe('E')
    expect(catalog.naturalCycle(STATUS.Successful)).toBe('E')
    expect(catalog.naturalCycle(STATUS.Declined)).toBe('E')
    expect(catalog.naturalCycle(STATUS.Chargeback)).toBe('I')
    expect(catalog.naturalCycle(STATUS.Refund)).toBe('I')
    expect(catalog.naturalCycle(STATUS.RDR)).toBe('I')
  })

  it('resolves the ids of the codes it needs', () => {
    expect(catalog.idOf('Pending')).toBe(STATUS.Pending)
    expect(catalog.idOf('Successful')).toBe(STATUS.Successful)
    expect(catalog.idOf('Declined')).toBe(STATUS.Declined)
    expect(catalog.idOf('Chargeback')).toBe(STATUS.Chargeback)
    expect(catalog.codeOf(STATUS.Refund)).toBe('Refund')
  })

  it('throws on a statusId outside the catalog (programming error, not a finding)', () => {
    expect(() => catalog.naturalCycle(99)).toThrow(/99/)
    expect(() => catalog.codeOf(99)).toThrow(/99/)
  })

  it('throws when a code the engine needs is missing from the catalog', () => {
    expect(() => createStatusCatalog(STATUSES.filter((s) => s.code !== 'Declined'))).toThrow(/Declined/)
  })
})
