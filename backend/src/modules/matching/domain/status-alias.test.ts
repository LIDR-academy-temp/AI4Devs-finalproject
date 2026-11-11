import { describe, expect, it } from 'vitest'
import { RULES_FOR_PROVIDER_A } from '../../imports/application/__fakes__/in-memory.js'
import { resolveStatusAlias } from './status-alias.js'

describe('resolveStatusAlias', () => {
  it('resolves CHB 2 to Chargeback with excludeAmount (README §1.2 "CHB 2")', () => {
    expect(resolveStatusAlias('CHB 2', RULES_FOR_PROVIDER_A)).toEqual({
      value: 'CHB 2',
      statusId: 4,
      statusName: 'Chargeback',
      excludeAmount: true,
    })
  })

  it('ignores case and surrounding spaces, keeping the value as read', () => {
    expect(resolveStatusAlias('successful', RULES_FOR_PROVIDER_A)).toMatchObject({
      statusId: 2,
      statusName: 'Successful',
    })
    expect(resolveStatusAlias('APPROVED', RULES_FOR_PROVIDER_A)).toMatchObject({ statusId: 2, excludeAmount: false })
    expect(resolveStatusAlias(' chb 2 ', RULES_FOR_PROVIDER_A)).toEqual({
      value: ' chb 2 ',
      statusId: 4,
      statusName: 'Chargeback',
      excludeAmount: true,
    })
    expect(resolveStatusAlias('Failed', RULES_FOR_PROVIDER_A)).toMatchObject({ statusId: 3, statusName: 'Declined' })
  })

  it('leaves an unknown value unresolved instead of guessing', () => {
    expect(resolveStatusAlias('Weird', RULES_FOR_PROVIDER_A)).toEqual({
      value: 'Weird',
      statusId: null,
      statusName: null,
      excludeAmount: false,
    })
  })
})
