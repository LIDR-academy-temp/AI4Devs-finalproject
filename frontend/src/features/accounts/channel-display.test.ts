import { describe, expect, it } from 'vitest'
import { batchLabel, roleOf, termReserve } from './channel-display'

// Spec accounts "Pantalla Account Detail: canales" and "Pantalla Channel Assignment" (web-admin-accounts design D4).
describe('termReserve', () => {
  it('shows the term, the reserve percent and its days, from the decimal text', () => {
    expect(termReserve({ settlementTermDays: 14, rollingReservePct: '0.100000', rollingReserveDays: 180 })).toBe(
      '14 d · 10 % / 180 d',
    )
  })

  it('shows a channel without reserve', () => {
    expect(termReserve({ settlementTermDays: 7, rollingReservePct: '0.000000', rollingReserveDays: 0 })).toBe(
      '7 d · 0 % / 0 d',
    )
  })

  it('keeps the decimals of a fractional percent', () => {
    expect(termReserve({ settlementTermDays: 10, rollingReservePct: '0.052500', rollingReserveDays: 120 })).toBe(
      '10 d · 5.25 % / 120 d',
    )
  })
})

describe('roleOf', () => {
  it('a channel whose primary account is this one', () => {
    expect(roleOf({ isPrimary: true, primaryAccount: { accountId: 'a', name: 'ProviderA-USD' } })).toBe('primary')
  })

  it('a historical channel names its current primary account', () => {
    expect(roleOf({ isPrimary: false, primaryAccount: { accountId: 'a', name: 'ProviderA-USD' } })).toBe(
      'historical · primary in ProviderA-USD',
    )
  })

  it('a historical channel without a primary account, or one the user cannot see', () => {
    expect(roleOf({ isPrimary: false, primaryAccount: null })).toBe('historical · no primary')
  })
})

describe('batchLabel', () => {
  it('names the batch that created the association', () => {
    expect(batchLabel(68)).toBe('batch 68')
  })

  it('shows a dash when no batch created it', () => {
    expect(batchLabel(null)).toBe('—')
  })
})
