import { describe, expect, it } from 'vitest'
import { validateImportSearch } from './validate-search'

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
})
