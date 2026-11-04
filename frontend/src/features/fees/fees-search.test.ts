import { describe, expect, it } from 'vitest'
import { feesQueryOf, validateFeesSearch } from './fees-search'

const USD = '0b6f4c1e-1a2b-4c3d-8e4f-000000000001'

// Spec fees "Pantalla Fees: filtros en la dirección" (web-admin-fees design D3).
describe('validateFeesSearch', () => {
  it('keeps the valid values', () => {
    expect(
      validateFeesSearch({
        merchantId: '1',
        providerId: 101,
        accountId: USD,
        kind: 'preset',
        status: 'closed',
        q: 'monthly',
        page: '2',
      }),
    ).toEqual({
      merchantId: 1,
      providerId: 101,
      accountId: USD,
      kind: 'preset',
      status: 'closed',
      q: 'monthly',
      page: 2,
    })
  })

  it('accepts status=all', () => {
    expect(validateFeesSearch({ status: 'all' })).toEqual({ status: 'all' })
  })

  it('drops invalid values instead of failing', () => {
    expect(
      validateFeesSearch({ merchantId: 'x', accountId: 'not-a-uuid', kind: 'other', status: 'withdrawn', page: '0' }),
    ).toEqual({})
  })

  it('drops page 1 and below: the first page is the address without page', () => {
    expect(validateFeesSearch({ page: '1' })).toEqual({})
    expect(validateFeesSearch({ page: '-3' })).toEqual({})
  })

  it('a level without the one above is dropped: the cascade starts at the merchant', () => {
    expect(validateFeesSearch({ providerId: '101', accountId: USD })).toEqual({})
    expect(validateFeesSearch({ merchantId: '1', accountId: USD })).toEqual({ merchantId: 1 })
  })

  it('trims q and drops it when empty or longer than 100', () => {
    expect(validateFeesSearch({ q: '  chargeback ' })).toEqual({ q: 'chargeback' })
    expect(validateFeesSearch({ q: '   ' })).toEqual({})
    expect(validateFeesSearch({ q: 'x'.repeat(101) })).toEqual({})
  })
})

describe('feesQueryOf', () => {
  it('without status in the address asks for the active fees, page 1', () => {
    expect(feesQueryOf({})).toEqual({ status: 'active', page: 1 })
  })

  it('status=all asks without status', () => {
    expect(feesQueryOf({ status: 'all', page: 3 })).toEqual({ page: 3 })
  })

  it('passes the ids as the strings of the query', () => {
    expect(feesQueryOf({ merchantId: 1, providerId: 101, accountId: USD, kind: 'transactional', q: 'mdr' })).toEqual({
      merchantId: '1',
      providerId: '101',
      accountId: USD,
      kind: 'transactional',
      q: 'mdr',
      status: 'active',
      page: 1,
    })
  })
})
