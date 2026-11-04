import { describe, expect, it } from 'vitest'
import {
  type AccountFormValues,
  createBody,
  type EditableAccount,
  initialCreateValues,
  initialEditValues,
  patchBody,
} from './account-form'
import { strings } from './strings'

// Spec accounts "Pantalla New account: formulario", "Pantalla Edit account" (web-admin-accounts design D5): what the
// form sends. Money is compared and sent as text; only the changed fields travel.
const e = strings.form.errors

const create = (patch: Partial<AccountFormValues> = {}): AccountFormValues => ({
  ...initialCreateValues({ merchantId: 2, providerId: 201 }),
  name: 'ProviderC-New',
  ...patch,
})

const EUR: EditableAccount = {
  name: 'ProviderA-EUR',
  chargebackReservePolicy: 'hold_until_term',
  rollingReserveCapAmt: '50000.0000',
  matchingRuleSetId: null,
}
const ALT: EditableAccount = {
  name: 'ProviderC-Alt',
  chargebackReservePolicy: 'hold_until_term',
  rollingReserveCapAmt: null,
  matchingRuleSetId: 3,
}
const edit = (account: EditableAccount, patch: Partial<AccountFormValues> = {}): AccountFormValues => ({
  ...initialEditValues(account),
  ...patch,
})

describe('initial values', () => {
  it('a new account starts with hold_until_term, no cap, no fees and the global rules', () => {
    expect(initialCreateValues({ merchantId: 2, providerId: 201 })).toEqual({
      name: '',
      merchantId: '2',
      providerId: '201',
      policy: 'hold_until_term',
      cap: '',
      copyFrom: '',
      ruleSetId: '',
      reason: '',
    })
  })

  it('without a provider chosen on the page, merchant and provider start empty', () => {
    expect(initialCreateValues({})).toMatchObject({ merchantId: '', providerId: '' })
  })

  it('editing starts from the account, with the cap and the rule set as text', () => {
    expect(initialEditValues(EUR)).toMatchObject({ name: 'ProviderA-EUR', cap: '50000.0000', ruleSetId: '' })
    expect(initialEditValues(ALT)).toMatchObject({ cap: '', ruleSetId: '3' })
  })
})

describe('createBody', () => {
  it('the minimal account sends every field, null by default', () => {
    expect(createBody(create())).toEqual({
      ok: true,
      providerId: 201,
      body: {
        name: 'ProviderC-New',
        chargebackReservePolicy: 'hold_until_term',
        rollingReserveCapAmt: null,
        matchingRuleSetId: null,
        copyFeesFromAccountId: null,
      },
    })
  })

  it('sends the name without the spaces of its ends, the cap as a string and the choices', () => {
    const result = createBody(
      create({
        name: '  ProviderC-New  ',
        policy: 'release_on_chargeback',
        cap: '25000.5',
        copyFrom: '0b6f4c1e-1a2b-4c3d-8e4f-000000000004',
        ruleSetId: '3',
      }),
    )
    expect(result).toEqual({
      ok: true,
      providerId: 201,
      body: {
        name: 'ProviderC-New',
        chargebackReservePolicy: 'release_on_chargeback',
        rollingReserveCapAmt: '25000.5',
        matchingRuleSetId: 3,
        copyFeesFromAccountId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000004',
      },
    })
  })

  it.each([
    ['an empty name', { name: '   ' }, 'name', e.nameRequired],
    ['a name of 51 characters', { name: 'x'.repeat(51) }, 'name', e.nameTooLong],
    ['no provider', { providerId: '' }, 'providerId', e.providerRequired],
    ['a negative cap', { cap: '-1' }, 'cap', e.capInvalid],
    ['a cap with 5 decimals', { cap: '1.23456' }, 'cap', e.capInvalid],
    ['a cap that is not a number', { cap: 'abc' }, 'cap', e.capInvalid],
  ])('refuses %s without sending', (_case, patch, field, message) => {
    expect(createBody(create(patch))).toEqual({ ok: false, errors: { [field]: message }, general: null })
  })

  it('accepts a name of exactly 50 characters and a cap of 0', () => {
    expect(createBody(create({ name: 'x'.repeat(50), cap: '0' })).ok).toBe(true)
  })
})

describe('patchBody', () => {
  it('sends only the changed fields: policy and cap', () => {
    expect(patchBody(edit(EUR, { policy: 'release_on_chargeback', cap: '1000' }), EUR)).toEqual({
      ok: true,
      body: { chargebackReservePolicy: 'release_on_chargeback', rollingReserveCapAmt: '1000' },
    })
  })

  it('the same cap written with another scale is no change', () => {
    expect(patchBody(edit(EUR, { cap: '50000' }), EUR)).toEqual({
      ok: false,
      errors: {},
      general: e.nothingToSave,
    })
  })

  it('an empty cap removes it', () => {
    expect(patchBody(edit(EUR, { cap: '' }), EUR)).toEqual({ ok: true, body: { rollingReserveCapAmt: null } })
  })

  it('None · global rules unlinks the rule set', () => {
    expect(patchBody(edit(ALT, { ruleSetId: '' }), ALT)).toEqual({ ok: true, body: { matchingRuleSetId: null } })
  })

  it('a change of case only is a change of name, as in the domain', () => {
    expect(patchBody(edit(ALT, { name: 'providerc-alt' }), ALT)).toEqual({ ok: true, body: { name: 'providerc-alt' } })
  })

  it('the spaces of the ends are no change', () => {
    expect(patchBody(edit(ALT, { name: ' ProviderC-Alt ' }), ALT).ok).toBe(false)
  })

  it('sends the reason with a change, without its spaces', () => {
    expect(patchBody(edit(ALT, { name: 'ProviderC-Alt2', reason: '  typo ' }), ALT)).toEqual({
      ok: true,
      body: { name: 'ProviderC-Alt2', reason: 'typo' },
    })
  })

  it('a reason alone is nothing to save', () => {
    expect(patchBody(edit(ALT, { reason: 'typo' }), ALT)).toEqual({ ok: false, errors: {}, general: e.nothingToSave })
  })

  it.each([
    ['an empty name', { name: '' }, 'name', e.nameRequired],
    ['a negative cap', { cap: '-5' }, 'cap', e.capInvalid],
    ['a reason of 501 characters', { reason: 'x'.repeat(501) }, 'reason', e.reasonTooLong],
  ])('refuses %s without sending', (_case, patch, field, message) => {
    expect(patchBody(edit(ALT, { cap: '10', ...patch }), ALT)).toEqual({
      ok: false,
      errors: { [field]: message },
      general: null,
    })
  })
})
