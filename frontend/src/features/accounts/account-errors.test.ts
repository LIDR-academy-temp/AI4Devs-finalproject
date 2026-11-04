import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { accountProblemOf } from './account-errors'
import { strings } from './strings'

// Spec accounts "Formularios de cuenta: errores del API" (web-admin-accounts design D6).
const e = strings.form.errors

describe('accountProblemOf', () => {
  it('account_name_taken goes next to the name', () => {
    const error = new ApiError(409, 'account_name_taken', 'The name is already used')
    expect(accountProblemOf(error)).toEqual({ fields: { name: e.nameTaken }, general: null, invalidate: null })
  })

  it.each([
    ['copyFeesFromAccountId', 'copyFrom', e.copyFromInvalid, null],
    ['matchingRuleSetId', 'ruleSetId', e.ruleSetInvalid, 'ruleSets'],
    ['rollingReserveCapAmt', 'cap', e.capInvalid, null],
  ])('a domain 400 on %s goes next to its field', (apiField, field, message, invalidate) => {
    const error = new ApiError(400, 'validation_error', 'invalid', { field: apiField })
    expect(accountProblemOf(error)).toEqual({ fields: { [field]: message }, general: null, invalidate })
  })

  it('a schema 400 (a list of issues) is a general message', () => {
    const error = new ApiError(400, 'validation_error', 'Invalid request', [{ path: 'name', message: 'bad' }])
    expect(accountProblemOf(error)).toEqual({ fields: {}, general: e.invalid, invalidate: null })
  })

  it('a 400 on a field the form does not have is a general message', () => {
    const error = new ApiError(400, 'validation_error', 'invalid', { field: 'color' })
    expect(accountProblemOf(error)).toEqual({ fields: {}, general: e.invalid, invalidate: null })
  })

  it('403 says the permission is missing', () => {
    expect(accountProblemOf(new ApiError(403, 'forbidden', 'Forbidden'))).toEqual({
      fields: {},
      general: e.forbidden,
      invalidate: null,
    })
  })

  it('404 says the account or provider is gone and asks for them again', () => {
    expect(accountProblemOf(new ApiError(404, 'not_found', 'Not found'))).toEqual({
      fields: {},
      general: e.notFound,
      invalidate: 'account',
    })
  })

  it.each([
    ['a network error', new TypeError('Failed to fetch')],
    ['a 500', new ApiError(500, 'internal_error', 'boom')],
  ])('%s asks to try again', (_case, error) => {
    expect(accountProblemOf(error)).toEqual({ fields: {}, general: e.unreachable, invalidate: null })
  })
})
