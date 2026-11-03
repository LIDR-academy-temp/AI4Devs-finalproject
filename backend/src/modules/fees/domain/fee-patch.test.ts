import { describe, expect, it } from 'vitest'
import { FeeInUseError, FeeRuleError } from './errors.js'
import { type FeeState, type FeeUsage, planCreate, planPatch } from './fee-patch.js'

// Spec fees "Crear un fee", "Reglas de un fee válido", "Corregir un fee en el sitio", "Campos editables de un fee en
// uso", "Cerrar la vigencia de un fee", "Cambiar un fee desde una fecha", "Límites del cambio desde una fecha"
// (admin-fees design D3).
const mdr: FeeState = {
  feeId: 'fee-1',
  feeTypeId: 1,
  fixedAmount: null,
  percentage: '0.100000',
  conditionalPercentage: null,
  conditionThresholdAmt: null,
  brandFixedAmount: null,
  brandPercentage: null,
  startDate: null,
  endDate: null,
  description: 'MDR',
}
const UNUSED: FeeUsage = { inUse: false, lastAppliedEventDate: null }
const USED: FeeUsage = { inUse: true, lastAppliedEventDate: '2026-10-15' }

function thrown(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected an error')
}

describe('planCreate', () => {
  it('normalizes money to 4 decimals and percentages to 6', () => {
    expect(
      planCreate({ feeTypeId: 4, fixedAmount: '25', percentage: '0.025', startDate: null, endDate: null }, 'new'),
    ).toEqual({
      feeId: 'new',
      feeTypeId: 4,
      fixedAmount: '25.0000',
      percentage: '0.025000',
      conditionalPercentage: null,
      conditionThresholdAmt: null,
      brandFixedAmount: null,
      brandPercentage: null,
      startDate: null,
      endDate: null,
      description: null,
    })
  })

  it('requires a fixed amount or a percentage (details.field = fixedAmount)', () => {
    const error = thrown(() => planCreate({ feeTypeId: 4, startDate: null, endDate: null }, 'new'))
    expect(error).toBeInstanceOf(FeeRuleError)
    expect((error as FeeRuleError).details).toEqual({ field: 'fixedAmount' })
  })

  it('rejects an end before the start (details.field = endDate)', () => {
    const error = thrown(() =>
      planCreate({ feeTypeId: 4, fixedAmount: '1', startDate: '2027-02-01', endDate: '2027-01-31' }, 'new'),
    )
    expect((error as FeeRuleError).details).toEqual({ field: 'endDate' })
  })

  it('takes a one-day validity', () => {
    expect(
      planCreate({ feeTypeId: 4, fixedAmount: '1', startDate: '2027-02-01', endDate: '2027-02-01' }, 'new').endDate,
    ).toBe('2027-02-01')
  })
})

describe('planPatch: in-place correction', () => {
  it('corrects every field of a fee without use, as updated', () => {
    const plan = planPatch(mdr, UNUSED, { percentage: '0.0275', startDate: '2026-01-01', description: null }, 'succ')

    expect(plan).toMatchObject({
      kind: 'correct',
      action: 'updated',
      changed: ['percentage', 'startDate', 'description'],
      before: mdr,
      after: { ...mdr, percentage: '0.027500', startDate: '2026-01-01', description: null },
    })
  })

  it('does not count a value equal to the current one as a change', () => {
    const plan = planPatch(mdr, USED, { percentage: '0.1', description: 'MDR 2026' }, 'succ')
    expect(plan).toMatchObject({ kind: 'correct', changed: ['description'] })
  })

  it('rejects the values and the start of a fee in use, naming the fields', () => {
    const error = thrown(() => planPatch(mdr, USED, { percentage: '0.03', startDate: '2026-01-01' }, 'succ'))
    expect(error).toBeInstanceOf(FeeInUseError)
    expect((error as FeeInUseError).details).toEqual({ fields: ['percentage', 'startDate'] })
  })

  it('takes the description of a fee in use', () => {
    expect(planPatch(mdr, USED, { description: 'Renegotiated in 2027' }, 'succ')).toMatchObject({
      kind: 'correct',
      action: 'updated',
      after: { description: 'Renegotiated in 2027' },
    })
  })

  it('closes a fee in use on its last applied event or later, as closed', () => {
    expect(planPatch(mdr, USED, { endDate: '2026-10-15' }, 'succ')).toMatchObject({
      kind: 'correct',
      action: 'closed',
      after: { endDate: '2026-10-15' },
    })
    expect(planPatch(mdr, USED, { endDate: '2026-10-31', reason: 'end of contract' }, 'succ')).toMatchObject({
      action: 'closed',
    })
  })

  it('rejects a closing that leaves out events already applied', () => {
    const error = thrown(() => planPatch(mdr, USED, { endDate: '2026-10-14' }, 'succ'))
    expect(error).toBeInstanceOf(FeeInUseError)
    expect((error as FeeInUseError).details).toEqual({ lastAppliedEventDate: '2026-10-15' })
  })

  it('a fee in use without dated events closes on any day', () => {
    expect(
      planPatch(mdr, { inUse: true, lastAppliedEventDate: null }, { endDate: '2020-01-01' }, 'succ'),
    ).toMatchObject({ action: 'closed' })
  })

  it('moving or reopening an end is updated, not closed', () => {
    const closed = { ...mdr, endDate: '2026-10-31' }
    expect(planPatch(closed, USED, { endDate: '2026-11-30' }, 'succ')).toMatchObject({ action: 'updated' })
    expect(planPatch(closed, USED, { endDate: null }, 'succ')).toMatchObject({ action: 'updated' })
  })

  it('keeps the rules of a valid fee', () => {
    expect((thrown(() => planPatch(mdr, UNUSED, { percentage: null }, 'succ')) as FeeRuleError).details).toEqual({
      field: 'fixedAmount',
    })
    const dated = { ...mdr, startDate: '2026-06-01' }
    expect((thrown(() => planPatch(dated, UNUSED, { endDate: '2026-05-31' }, 'succ')) as FeeRuleError).details).toEqual(
      { field: 'endDate' },
    )
  })
})

describe('planPatch: change from a date', () => {
  it('closes the fee the day before and opens a successor with the merged values and the original end', () => {
    const plan = planPatch(mdr, USED, { effectiveFrom: '2026-11-01', percentage: '0.095' }, 'succ')

    expect(plan).toEqual({
      kind: 'change',
      before: mdr,
      closed: { ...mdr, endDate: '2026-10-31' },
      successor: { ...mdr, feeId: 'succ', percentage: '0.095000', startDate: '2026-11-01', endDate: null },
    })
  })

  it('inherits a closed end', () => {
    const plan = planPatch(
      { ...mdr, endDate: '2027-06-30' },
      UNUSED,
      { effectiveFrom: '2027-01-01', fixedAmount: '1' },
      'succ',
    )
    expect(plan).toMatchObject({ successor: { startDate: '2027-01-01', endDate: '2027-06-30', fixedAmount: '1.0000' } })
  })

  it('takes an effectiveFrom equal to the end of the fee', () => {
    const plan = planPatch(
      { ...mdr, endDate: '2027-06-30' },
      UNUSED,
      { effectiveFrom: '2027-06-30', fixedAmount: '1' },
      's',
    )
    expect(plan).toMatchObject({ closed: { endDate: '2027-06-29' }, successor: { startDate: '2027-06-30' } })
  })

  it('rejects an effectiveFrom on or before the start, or after the end (details.field = effectiveFrom)', () => {
    const scheduled = { ...mdr, startDate: '2027-01-01', endDate: '2027-12-31' }
    for (const effectiveFrom of ['2027-01-01', '2026-12-31', '2028-01-01']) {
      const error = thrown(() => planPatch(scheduled, UNUSED, { effectiveFrom, fixedAmount: '1' }, 'succ'))
      expect(error, effectiveFrom).toBeInstanceOf(FeeRuleError)
      expect((error as FeeRuleError).details).toEqual({ field: 'effectiveFrom' })
    }
  })

  it('rejects a change whose day before is earlier than the last applied event', () => {
    const error = thrown(() => planPatch(mdr, USED, { effectiveFrom: '2026-10-15', fixedAmount: '50' }, 'succ'))
    expect(error).toBeInstanceOf(FeeInUseError)
    expect((error as FeeInUseError).details).toEqual({ lastAppliedEventDate: '2026-10-15' })
    expect(planPatch(mdr, USED, { effectiveFrom: '2026-10-16', fixedAmount: '50' }, 'succ').kind).toBe('change')
  })

  it('keeps the rules of a valid fee on the successor', () => {
    const error = thrown(() => planPatch(mdr, UNUSED, { effectiveFrom: '2026-11-01', percentage: null }, 'succ'))
    expect((error as FeeRuleError).details).toEqual({ field: 'fixedAmount' })
  })
})
