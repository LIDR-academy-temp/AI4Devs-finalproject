import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { formPath, ruleProblemOf } from './rule-errors'
import { strings } from './strings'

// Design D6; spec matching "Pantalla Matching Rules: errores del API". The message of a domain 400 is the API's.
const e = strings.form.errors

/** The shape of the form the error is read against: four sheets, three columns, two aliases and a name. */
const FORM = { sheetRules: 4, columnRules: 3, statusAliases: 2, name: true }

const domain400 = (field: string, message = 'API message') => new ApiError(400, 'validation_error', message, { field })

describe('ruleProblemOf', () => {
  it.each([
    ['sheetRules[2].statusId', 'Chargeback is a cycle I status'],
    ['columnRules[0].columnPattern', 'The regex does not compile'],
    ['statusAliases[1].alias', 'A pattern of the list is repeated'],
    ['name', 'The name is not valid'],
  ])('a domain 400 on %s goes next to that field of that row, with the message of the API', (field, message) => {
    expect(ruleProblemOf(domain400(field, message), FORM)).toEqual({
      fields: { [field]: message },
      general: null,
      invalidate: null,
    })
  })

  it.each([
    ['a row the form does not have', 'sheetRules[9].cycle'],
    ['a field a sheet rule does not have', 'sheetRules[0].targetField'],
    ['aliases in a rule set', 'statusAliases[0].alias'],
    ['an unknown field', 'color'],
  ])('a domain 400 on %s is a general message', (_, field) => {
    const shape = field.startsWith('statusAliases') ? { ...FORM, statusAliases: 0 } : FORM
    expect(ruleProblemOf(domain400(field), shape)).toEqual({ fields: {}, general: e.invalid, invalidate: null })
  })

  it('a schema 400 (a list of issues) is a general message', () => {
    const error = new ApiError(400, 'validation_error', 'Invalid request', [{ path: 'sheetRules.0', message: 'bad' }])
    expect(ruleProblemOf(error, FORM)).toEqual({ fields: {}, general: e.invalid, invalidate: null })
  })

  it('rule_set_name_taken goes next to the name', () => {
    const error = new ApiError(409, 'rule_set_name_taken', 'The name is already used')
    expect(ruleProblemOf(error, FORM)).toEqual({ fields: { name: e.nameTaken }, general: null, invalidate: null })
  })

  it('without a name field (edit mode), rule_set_name_taken and a 400 on the name are general messages', () => {
    const noName = { ...FORM, name: false }
    const taken = new ApiError(409, 'rule_set_name_taken', 'The name is already used')
    expect(ruleProblemOf(taken, noName)).toEqual({ fields: {}, general: e.nameTaken, invalidate: null })
    expect(ruleProblemOf(domain400('name'), noName)).toEqual({ fields: {}, general: e.invalid, invalidate: null })
  })

  it.each([
    [new ApiError(403, 'forbidden', 'Forbidden'), e.forbidden, null],
    [new ApiError(404, 'not_found', 'Not found'), e.notFound, 'detail'],
    [new ApiError(500, 'internal_error', 'Boom'), e.saveFailed, null],
    [new TypeError('Failed to fetch'), e.unreachable, null],
  ])('%s is a general message', (error, general, invalidate) => {
    expect(ruleProblemOf(error, FORM)).toEqual({ fields: {}, general, invalidate })
  })
})

describe('formPath', () => {
  it('turns details.field into the path of the form', () => {
    expect(formPath('sheetRules[2].statusId')).toBe('sheetRules.2.statusId')
    expect(formPath('name')).toBe('name')
  })
})
