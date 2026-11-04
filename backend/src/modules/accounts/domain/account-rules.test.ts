import { describe, expect, it } from 'vitest'
import { type AccountState, normalizeCap, planAccountPatch } from './account-rules.js'
import { AccountRuleError } from './errors.js'

// admin-accounts design D3; spec accounts "Editar una cuenta", "Cerrar y reabrir una cuenta", "Auditoría de cuentas".

const current: AccountState = {
  name: 'bruno-x',
  chargebackReservePolicy: 'hold_until_term',
  rollingReserveCapAmt: '1000.0000',
  matchingRuleSetId: null,
  isActive: true,
}

describe('normalizeCap', () => {
  it('normalizes a decimal string to four decimals', () => {
    expect(normalizeCap('25000')).toBe('25000.0000')
    expect(normalizeCap('0.5')).toBe('0.5000')
    expect(normalizeCap('0')).toBe('0.0000')
  })

  it('keeps null as no cap', () => {
    expect(normalizeCap(null)).toBeNull()
  })

  it('rejects a negative cap as 400 validation_error on rollingReserveCapAmt', () => {
    const error = (() => {
      try {
        normalizeCap('-1')
      } catch (e) {
        return e
      }
    })()

    expect(error).toBeInstanceOf(AccountRuleError)
    expect(error).toMatchObject({ status: 400, code: 'validation_error', details: { field: 'rollingReserveCapAmt' } })
  })
})

describe('planAccountPatch', () => {
  it('finds no change when every value is the stored one', () => {
    const plan = planAccountPatch(current, {
      name: 'bruno-x',
      chargebackReservePolicy: 'hold_until_term',
      rollingReserveCapAmt: '1000.0000',
      matchingRuleSetId: null,
      isActive: true,
    })

    expect(plan.changes).toEqual({})
  })

  it('treats the same cap with another scale as no change', () => {
    expect(planAccountPatch(current, { rollingReserveCapAmt: '1000' }).changes).toEqual({})
    expect(planAccountPatch(current, { rollingReserveCapAmt: '1000.00' }).changes).toEqual({})
  })

  it('treats a rename that only changes case as a change', () => {
    expect(planAccountPatch(current, { name: 'Bruno-X' }).changes).toEqual({
      name: { before: 'bruno-x', after: 'Bruno-X' },
    })
  })

  it('records before and after of each changed field, money as text, as account.update', () => {
    const plan = planAccountPatch(current, {
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '2500',
      matchingRuleSetId: 7,
    })

    expect(plan).toEqual({
      action: 'account.update',
      changes: {
        chargebackReservePolicy: { before: 'hold_until_term', after: 'release_on_chargeback' },
        rollingReserveCapAmt: { before: '1000.0000', after: '2500.0000' },
        matchingRuleSetId: { before: null, after: 7 },
      },
    })
  })

  it('removes the cap with null', () => {
    expect(planAccountPatch(current, { rollingReserveCapAmt: null }).changes).toEqual({
      rollingReserveCapAmt: { before: '1000.0000', after: null },
    })
  })

  it('ignores the fields the body leaves out', () => {
    expect(planAccountPatch(current, { name: 'bruno-y' }).changes).toEqual({
      name: { before: 'bruno-x', after: 'bruno-y' },
    })
  })

  it('is account.close when isActive goes to false, even with other changes ("Cierre auditado con cambios")', () => {
    const plan = planAccountPatch(current, { isActive: false, rollingReserveCapAmt: null })

    expect(plan).toEqual({
      action: 'account.close',
      changes: {
        isActive: { before: true, after: false },
        rollingReserveCapAmt: { before: '1000.0000', after: null },
      },
    })
  })

  it('is account.reopen when isActive goes back to true', () => {
    const plan = planAccountPatch({ ...current, isActive: false }, { isActive: true })

    expect(plan).toEqual({ action: 'account.reopen', changes: { isActive: { before: false, after: true } } })
  })

  it('is account.update when isActive is sent with its stored value', () => {
    expect(planAccountPatch(current, { isActive: true, name: 'bruno-y' }).action).toBe('account.update')
  })

  it('rejects a negative cap before planning', () => {
    expect(() => planAccountPatch(current, { rollingReserveCapAmt: '-0.0001' })).toThrow(AccountRuleError)
  })
})
