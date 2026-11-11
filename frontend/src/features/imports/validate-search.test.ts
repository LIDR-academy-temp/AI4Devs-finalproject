import { describe, expect, it } from 'vitest'
import { validateImportSearch, validateInProgressSearch } from './validate-search'

describe('validateImportSearch', () => {
  it('keeps the chosen validation, the page of its findings and the open finding (design D5)', () => {
    expect(
      validateImportSearch({ step: 'analysis', validation: 'duplicate_in_batch', ipage: '2', issue: '881' }),
    ).toEqual({ step: 'analysis', validation: 'duplicate_in_batch', ipage: 2, issue: 881 })
  })

  it('drops an unknown validation, a first or invalid page and a malformed finding', () => {
    expect(validateImportSearch({ validation: 'foo', ipage: '0', issue: 'abc' })).toEqual({})
    expect(validateImportSearch({ ipage: '1', issue: '0' })).toEqual({})
  })

  it('keeps step, match and page as before', () => {
    expect(validateImportSearch({ step: 'analysis', match: 'unmatched', page: '3' })).toEqual({
      step: 'analysis',
      match: 'unmatched',
      page: 3,
    })
    expect(validateImportSearch({ step: 'nope', match: 'nope', page: '1' })).toEqual({})
  })

  // #110: the router lays the result over the raw search, so an invalid key has to be there, undefined, or its raw
  // value would reach the query. toEqual takes an undefined key and an absent one as equal, hence `in`.
  it('returns each invalid key, undefined, so the raw value does not survive', () => {
    const result = validateImportSearch({
      step: 'nope',
      match: 'weird',
      page: 'abc',
      validation: 'foo',
      ipage: 'abc',
      issue: 'abc',
    })

    for (const key of ['step', 'match', 'page', 'validation', 'ipage', 'issue'] as const) {
      expect(key in result).toBe(true)
      expect(result[key]).toBeUndefined()
    }
  })
})

describe('validateInProgressSearch (spec "Pantalla In Progress: filtros", design D5)', () => {
  const ACCOUNT = '7b1f3c7e-5d2a-4e9b-9c1d-2f3a4b5c6d7e'

  it('keeps the merchant, provider, account, an open status, mine and a page past the first', () => {
    expect(
      validateInProgressSearch({
        merchantId: 2,
        providerId: 201,
        accountId: ACCOUNT,
        status: 'mapped',
        mine: true,
        page: 3,
      }),
    ).toEqual({ merchantId: 2, providerId: 201, accountId: ACCOUNT, status: 'mapped', mine: true, page: 3 })
  })

  it('drops a closed or unknown status, a false mine, the first page and a level without the one above', () => {
    expect(validateInProgressSearch({ status: 'cancelled', mine: false, page: 1, providerId: 201 })).toEqual({})
    expect(validateInProgressSearch({ status: 'weird', mine: 'yes', merchantId: 'abc', accountId: ACCOUNT })).toEqual(
      {},
    )
    expect(validateInProgressSearch({ merchantId: 1, accountId: ACCOUNT })).toEqual({ merchantId: 1 })
  })

  it('returns each invalid key, undefined, so the raw value does not survive (#110)', () => {
    const result = validateInProgressSearch({
      merchantId: 'abc',
      providerId: 201,
      accountId: ACCOUNT,
      status: 'cancelled',
      mine: 'yes',
      page: 'abc',
    })

    for (const key of ['merchantId', 'providerId', 'accountId', 'status', 'mine', 'page'] as const) {
      expect(key in result).toBe(true)
      expect(result[key]).toBeUndefined()
    }
  })
})
