import { describe, expect, it } from 'vitest'
import { chooseMerchant, chooseProvider, validateChannelAssignmentSearch } from './channel-assignment-search'

// Search params of Channel Assignment (web-admin-accounts design D8): optional merchant and provider.
describe('validateChannelAssignmentSearch', () => {
  it('keeps valid ids, as numbers', () => {
    expect(validateChannelAssignmentSearch({ merchantId: '1', providerId: '102' })).toEqual({
      merchantId: 1,
      providerId: 102,
    })
  })

  it.each([
    ['text', { merchantId: 'abc' }],
    ['zero', { merchantId: '0' }],
    ['a negative id', { merchantId: '-1' }],
    ['a decimal', { merchantId: '1.5' }],
  ])('drops %s', (_case, search) => {
    expect(validateChannelAssignmentSearch(search)).toEqual({ merchantId: undefined, providerId: undefined })
  })

  it('drops a provider without a merchant: every filter is checked against the lists the screen shows', () => {
    expect(validateChannelAssignmentSearch({ providerId: '101' })).toEqual({
      merchantId: undefined,
      providerId: undefined,
    })
  })
})

describe('choosing in the filters', () => {
  it('choosing a merchant clears the provider', () => {
    expect(chooseMerchant('2')).toEqual({ merchantId: 2, providerId: undefined })
  })

  it('All merchants clears both', () => {
    expect(chooseMerchant('')).toEqual({ merchantId: undefined, providerId: undefined })
  })

  it('choosing a provider keeps the merchant', () => {
    expect(chooseProvider({ merchantId: 1 }, '102')).toEqual({ merchantId: 1, providerId: 102 })
    expect(chooseProvider({ merchantId: 1, providerId: 102 }, '')).toEqual({ merchantId: 1, providerId: undefined })
  })
})
