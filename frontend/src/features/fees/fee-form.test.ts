import { describe, expect, it } from 'vitest'
import { type EditableFee, type FeeFormValues, feeFormBody, initialFeeValues } from './fee-form'
import { strings } from './strings'

// web-admin-fees design D4, D6: the form's text values → the body of the API, with only what changed; the local
// checks are the ones that save a sure 400. Amounts and rates never go through a JS number.
const e = strings.form.errors

const mdr: EditableFee = {
  feeTypeId: 1,
  fixedAmount: null,
  percentage: '0.025000',
  startDate: null,
  endDate: null,
  description: null,
  inUse: false,
}

const values = (mode: 'create' | 'correct' | 'change', patch: Partial<FeeFormValues>, fee: EditableFee = mdr) => ({
  ...initialFeeValues(mode, mode === 'create' ? undefined : fee),
  ...patch,
})

describe('initialFeeValues', () => {
  it('a new fee starts open on both sides, without type nor values', () => {
    expect(initialFeeValues('create')).toEqual({
      feeTypeId: '',
      fixedAmount: '',
      percent: '',
      startDate: '',
      always: true,
      endDate: '',
      noEnd: true,
      description: '',
      reason: '',
      effectiveFrom: '',
    })
  })

  it('an existing fee shows its values, the rate as a percent', () => {
    expect(
      initialFeeValues('correct', { ...mdr, fixedAmount: '0.1200', startDate: '2026-01-01', description: 'MDR' }),
    ).toMatchObject({
      feeTypeId: '1',
      fixedAmount: '0.1200',
      percent: '2.5',
      startDate: '2026-01-01',
      always: false,
      endDate: '',
      noEnd: true,
      description: 'MDR',
    })
  })
})

describe('feeFormBody: create', () => {
  it('a fixed amount, always and no end date', () => {
    expect(feeFormBody('create', values('create', { feeTypeId: '121', fixedAmount: '15' }))).toEqual({
      ok: true,
      body: { feeTypeId: 121, fixedAmount: '15', startDate: null, endDate: null },
    })
  })

  it('a percentage from a day: the fraction as text', () => {
    expect(
      feeFormBody(
        'create',
        values('create', { feeTypeId: '1', percent: '2.75', always: false, startDate: '2027-01-01' }),
      ),
    ).toEqual({ ok: true, body: { feeTypeId: 1, percentage: '0.027500', startDate: '2027-01-01', endDate: null } })
  })

  it('both, an end and a description without the spaces of its ends', () => {
    expect(
      feeFormBody(
        'create',
        values('create', {
          feeTypeId: '2',
          fixedAmount: '0.12',
          percent: '1',
          noEnd: false,
          endDate: '2027-12-31',
          description: '  Deposit fee ',
        }),
      ),
    ).toEqual({
      ok: true,
      body: {
        feeTypeId: 2,
        fixedAmount: '0.12',
        percentage: '0.010000',
        startDate: null,
        endDate: '2027-12-31',
        description: 'Deposit fee',
      },
    })
  })

  it('neither an amount nor a percentage', () => {
    expect(feeFormBody('create', values('create', { feeTypeId: '1' }))).toEqual({
      ok: false,
      errors: { fixedAmount: e.amountOrPercent, percent: e.amountOrPercent },
      general: null,
    })
  })

  it('a percentage with more than 4 decimals (6 as a fraction)', () => {
    const result = feeFormBody('create', values('create', { feeTypeId: '1', percent: '2.75001' }))
    expect(result).toMatchObject({ ok: false, errors: { percent: e.percentTooPrecise } })
  })

  it('a percentage outside 0–100', () => {
    const result = feeFormBody('create', values('create', { feeTypeId: '1', percent: '100.5' }))
    expect(result).toMatchObject({ ok: false, errors: { percent: e.percentOutOfRange } })
  })

  it('a malformed percentage or amount', () => {
    expect(feeFormBody('create', values('create', { feeTypeId: '1', percent: '2,5' }))).toMatchObject({
      ok: false,
      errors: { percent: e.percentInvalid },
    })
    expect(feeFormBody('create', values('create', { feeTypeId: '1', fixedAmount: '1.23456' }))).toMatchObject({
      ok: false,
      errors: { fixedAmount: e.amountInvalid },
    })
  })

  it('without a type, or without a day when always / no end date is not ticked', () => {
    expect(feeFormBody('create', values('create', { fixedAmount: '1', always: false, noEnd: false }))).toMatchObject({
      ok: false,
      errors: { feeTypeId: e.feeTypeRequired, startDate: e.dateRequired, endDate: e.dateRequired },
    })
  })
})

describe('feeFormBody: correct in place', () => {
  it('only the changed fields, the percentage as a fraction, and the reason', () => {
    expect(feeFormBody('correct', values('correct', { percent: '2.75', reason: ' typo ' }), mdr)).toEqual({
      ok: true,
      body: { percentage: '0.027500', reason: 'typo' },
    })
  })

  it('"15" and "15.0000" are the same amount: nothing to save', () => {
    const fee = { ...mdr, fixedAmount: '15.0000', percentage: null }
    expect(feeFormBody('correct', values('correct', { fixedAmount: '15' }, fee), fee)).toEqual({
      ok: false,
      errors: {},
      general: e.nothingToSave,
    })
  })

  it('a fee in use sends only description and end date, whatever the other fields hold', () => {
    const fee = { ...mdr, inUse: true }
    expect(
      feeFormBody('correct', values('correct', { percent: '9', noEnd: false, endDate: '2026-10-31' }, fee), fee),
    ).toEqual({ ok: true, body: { endDate: '2026-10-31' } })
  })

  it('clearing the description sends null; giving a start sends it', () => {
    const fee = { ...mdr, description: 'MDR' }
    expect(
      feeFormBody('correct', values('correct', { description: '', always: false, startDate: '2027-01-01' }, fee), fee),
    ).toEqual({ ok: true, body: { description: null, startDate: '2027-01-01' } })
  })

  it('clearing the only value is refused locally', () => {
    expect(feeFormBody('correct', values('correct', { percent: '' }), mdr)).toMatchObject({
      ok: false,
      errors: { fixedAmount: e.amountOrPercent, percent: e.amountOrPercent },
    })
  })
})

describe('feeFormBody: change from a date', () => {
  const inUse = { ...mdr, percentage: '0.100000', inUse: true }

  it('effectiveFrom and only the changed values', () => {
    expect(
      feeFormBody('change', values('change', { effectiveFrom: '2026-11-01', percent: '9.5' }, inUse), inUse),
    ).toEqual({ ok: true, body: { effectiveFrom: '2026-11-01', percentage: '0.095000' } })
  })

  it('without a new value', () => {
    expect(feeFormBody('change', values('change', { effectiveFrom: '2026-11-01' }, inUse), inUse)).toEqual({
      ok: false,
      errors: {},
      general: e.changeAValue,
    })
  })

  it('without the day', () => {
    expect(feeFormBody('change', values('change', { percent: '9.5' }, inUse), inUse)).toMatchObject({
      ok: false,
      errors: { effectiveFrom: e.effectiveFromRequired },
    })
  })
})
