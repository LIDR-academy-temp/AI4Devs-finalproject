import { describe, expect, it } from 'vitest'
import { validateSettlementListSearch } from './list-search'

// Search params of Settlement List (settlements-browse design D7): an invalid value is dropped, as the API would
// reject it.
describe('validateSettlementListSearch', () => {
  it('keeps days that exist', () => {
    expect(validateSettlementListSearch({ from: '2026-02-28', to: '2028-02-29' })).toEqual({
      from: '2026-02-28',
      to: '2028-02-29',
    })
  })

  it.each(['2026-02-30', '2026-13-01', '2027-02-29', '24/10/2026', '2026-10-24T00:00:00Z', 20261024])(
    'drops the impossible or malformed day %j',
    (value) => {
      expect(validateSettlementListSearch({ from: value, to: value })).toEqual({})
    },
  )

  // #110: the router lays the result over the raw search, so an invalid key has to be there, undefined, or its raw
  // value would reach the query. toEqual takes an undefined key and an absent one as equal, hence `in`.
  it('returns each invalid key, undefined, so the raw value does not survive', () => {
    const result = validateSettlementListSearch({
      merchantId: 'abc',
      providerId: '0',
      accountId: 'not-a-uuid',
      status: 'foo',
      dateField: 'foo',
      from: '2026-02-30',
      to: '2026-02-30',
      page: 'abc',
    })

    const keys = ['merchantId', 'providerId', 'accountId', 'status', 'dateField', 'from', 'to', 'page'] as const
    expect(Object.keys(result).sort()).toEqual([...keys].sort())
    for (const key of keys) {
      expect(key in result).toBe(true)
      expect(result[key]).toBeUndefined()
    }
  })
})
