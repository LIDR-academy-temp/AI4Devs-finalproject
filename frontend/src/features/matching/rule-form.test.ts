import type { GlobalMatchingRules, MatchingRuleSetDetail } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import {
  checkRules,
  createBody,
  globalsBody,
  inputsOf,
  newColumnRule,
  newSheetRule,
  newStatusAlias,
  ruleSetBody,
  valuesOf,
} from './rule-form'
import { strings } from './strings'

// Design D4: detail ⇄ form values ⇄ bodies. The browser only applies the *Input schemas and adapts the fields to the
// kind of sheet; every domain rule is the API's (spec matching "Pantalla Matching Rules: avisos del formulario").
const m = strings.form.local

const LEGACY: MatchingRuleSetDetail = {
  ruleSetId: 3,
  name: 'Provider C legacy',
  isActive: true,
  provider: { providerId: 201, name: 'Provider C' },
  accounts: [{ accountId: 'a0000000-0000-4000-8000-000000000005', name: 'ProviderC-Alt', isActive: true }],
  sheetRules: [
    {
      sheetRuleId: 31,
      sheetPattern: 'TRX',
      isRegex: false,
      kind: 'transactions',
      cycle: 'E',
      statusId: null,
      priority: 10,
      isActive: true,
    },
    {
      sheetRuleId: 32,
      sheetPattern: 'CB',
      isRegex: false,
      kind: 'transactions',
      cycle: 'I',
      statusId: null,
      priority: 10,
      isActive: true,
    },
    {
      sheetRuleId: 33,
      sheetPattern: 'Fail',
      isRegex: false,
      kind: 'transactions',
      cycle: 'E',
      statusId: 3,
      priority: 10,
      isActive: true,
    },
    {
      sheetRuleId: 34,
      sheetPattern: 'Summary',
      isRegex: false,
      kind: 'ignore',
      cycle: null,
      statusId: null,
      priority: 10,
      isActive: true,
    },
  ],
  columnRules: [
    {
      columnRuleId: 41,
      sheetPattern: null,
      columnPattern: 'Merchant Order No#',
      isRegex: false,
      targetField: 'transactionId',
      priority: 10,
      isActive: true,
    },
    {
      columnRuleId: 42,
      sheetPattern: null,
      columnPattern: 'Order Status',
      isRegex: false,
      targetField: 'status',
      priority: 10,
      isActive: true,
    },
    {
      columnRuleId: 43,
      sheetPattern: null,
      columnPattern: 'Amount USD',
      isRegex: false,
      targetField: 'amount',
      priority: 10,
      isActive: true,
    },
  ],
  rowIgnoreRules: [{ rowIgnoreId: 5, pattern: 'Total*', isRegex: false, description: null, isActive: true }],
}

const LEGACY_SHEETS = [
  {
    sheetPattern: 'TRX',
    isRegex: false,
    kind: 'transactions',
    cycle: 'E',
    statusId: null,
    priority: 10,
    isActive: true,
  },
  {
    sheetPattern: 'CB',
    isRegex: false,
    kind: 'transactions',
    cycle: 'I',
    statusId: null,
    priority: 10,
    isActive: true,
  },
  { sheetPattern: 'Fail', isRegex: false, kind: 'transactions', cycle: 'E', statusId: 3, priority: 10, isActive: true },
  {
    sheetPattern: 'Summary',
    isRegex: false,
    kind: 'ignore',
    cycle: null,
    statusId: null,
    priority: 10,
    isActive: true,
  },
]
const LEGACY_COLUMNS = [
  {
    sheetPattern: null,
    columnPattern: 'Merchant Order No#',
    isRegex: false,
    targetField: 'transactionId',
    priority: 10,
    isActive: true,
  },
  {
    sheetPattern: null,
    columnPattern: 'Order Status',
    isRegex: false,
    targetField: 'status',
    priority: 10,
    isActive: true,
  },
  {
    sheetPattern: null,
    columnPattern: 'Amount USD',
    isRegex: false,
    targetField: 'amount',
    priority: 10,
    isActive: true,
  },
]

const GLOBALS: GlobalMatchingRules = {
  sheetRules: [
    {
      sheetRuleId: 1,
      sheetPattern: 'APP',
      isRegex: false,
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
      priority: 10,
      isActive: true,
    },
  ],
  columnRules: [
    {
      columnRuleId: 1,
      sheetPattern: null,
      columnPattern: 'ID',
      isRegex: false,
      targetField: 'transactionId',
      priority: 10,
      isActive: true,
    },
  ],
  rowIgnoreRules: [
    { rowIgnoreId: 1, pattern: 'transactionId:empty', isRegex: false, description: null, isActive: true },
  ],
  statusAliases: [{ alias: 'CHB 2', statusId: 4, excludeAmount: true, isLegacy: true }],
  statuses: [{ statusId: 2, name: 'Successful', cycle: 'E' }],
}

/** The checked rules of some values, or the test fails. */
function rulesOf(values: ReturnType<typeof valuesOf>) {
  const check = checkRules(values)
  if (!check.ok) throw new Error(`unexpected local errors: ${JSON.stringify(check.fields)}`)
  return check.rules
}

describe('valuesOf', () => {
  it('drops the rule ids, the rows to ignore and the statuses, in the order of the answer', () => {
    const values = valuesOf(LEGACY)
    expect(values.sheetRules.map((r) => r.sheetPattern)).toEqual(['TRX', 'CB', 'Fail', 'Summary'])
    expect(values.columnRules.map((r) => r.columnPattern)).toEqual(['Merchant Order No#', 'Order Status', 'Amount USD'])
    for (const row of [...values.sheetRules, ...values.columnRules]) {
      expect(row).not.toHaveProperty('sheetRuleId')
      expect(row).not.toHaveProperty('columnRuleId')
    }
    expect(values).not.toHaveProperty('rowIgnoreRules')
    expect(values).not.toHaveProperty('statuses')
    expect(values.reason).toBe('')
  })

  it('round-trips the stored rules unchanged', () => {
    expect(rulesOf(valuesOf(LEGACY))).toEqual({
      sheetRules: LEGACY_SHEETS,
      columnRules: LEGACY_COLUMNS,
      statusAliases: [],
    })
  })

  it('reads the status aliases of the globals', () => {
    expect(rulesOf(valuesOf(GLOBALS)).statusAliases).toEqual([
      { alias: 'CHB 2', statusId: 4, excludeAmount: true, isLegacy: true },
    ])
  })
})

describe('inputsOf', () => {
  it('is the stored document without ids, for Rename and Activate', () => {
    expect(inputsOf(LEGACY)).toEqual({ sheetRules: LEGACY_SHEETS, columnRules: LEGACY_COLUMNS })
  })
})

describe('ruleSetBody', () => {
  it('is the whole document with the edited rules, without ids nor read-only fields', () => {
    const values = valuesOf(LEGACY)
    values.sheetRules[2] = { ...values.sheetRules[2]!, statusId: '' }
    const body = ruleSetBody(LEGACY, { ...rulesOf(values), reason: values.reason })

    expect(body).toEqual({
      name: 'Provider C legacy',
      isActive: true,
      sheetRules: LEGACY_SHEETS.map((r) => (r.sheetPattern === 'Fail' ? { ...r, statusId: null } : r)),
      columnRules: LEGACY_COLUMNS,
    })
    expect(body).not.toHaveProperty('reason')
    expect(body).not.toHaveProperty('rowIgnoreRules')
  })

  it('keeps the order of the form (moving a rule is a change)', () => {
    const values = valuesOf(LEGACY)
    values.sheetRules = [values.sheetRules[1]!, values.sheetRules[0]!, ...values.sheetRules.slice(2)]
    const body = ruleSetBody(LEGACY, rulesOf(values))
    expect(body.sheetRules.map((r) => r.sheetPattern)).toEqual(['CB', 'TRX', 'Fail', 'Summary'])
  })

  it('sends the reason trimmed, and only when it is not blank', () => {
    expect(ruleSetBody(LEGACY, { reason: '  New column layout  ' }).reason).toBe('New column layout')
    expect(ruleSetBody(LEGACY, { reason: '   ' })).not.toHaveProperty('reason')
  })

  it('Rename changes only the name and keeps the stored rules', () => {
    expect(ruleSetBody(LEGACY, { name: 'Provider C 2019' })).toEqual({
      name: 'Provider C 2019',
      isActive: true,
      sheetRules: LEGACY_SHEETS,
      columnRules: LEGACY_COLUMNS,
    })
  })

  it('Deactivate changes only isActive', () => {
    expect(ruleSetBody(LEGACY, { isActive: false })).toEqual({
      name: 'Provider C legacy',
      isActive: false,
      sheetRules: LEGACY_SHEETS,
      columnRules: LEGACY_COLUMNS,
    })
  })
})

describe('globalsBody', () => {
  it('sends the aliases and never the rows to ignore nor the statuses', () => {
    const values = valuesOf(GLOBALS)
    values.statusAliases.push({ ...newStatusAlias(), alias: 'Approved OK', statusId: '2' })
    const body = globalsBody(rulesOf(values), '')

    expect(body).toEqual({
      sheetRules: [
        {
          sheetPattern: 'APP',
          isRegex: false,
          kind: 'transactions',
          cycle: 'E',
          statusId: 2,
          priority: 10,
          isActive: true,
        },
      ],
      columnRules: [
        {
          sheetPattern: null,
          columnPattern: 'ID',
          isRegex: false,
          targetField: 'transactionId',
          priority: 10,
          isActive: true,
        },
      ],
      statusAliases: [
        { alias: 'CHB 2', statusId: 4, excludeAmount: true, isLegacy: true },
        { alias: 'Approved OK', statusId: 2, excludeAmount: false, isLegacy: false },
      ],
    })
    expect(body).not.toHaveProperty('rowIgnoreRules')
    expect(body).not.toHaveProperty('statuses')
  })
})

describe('createBody', () => {
  it('starts empty', () => {
    expect(createBody(' Provider C v2 ', null, '')).toEqual({ name: 'Provider C v2', sheetRules: [], columnRules: [] })
  })

  it('copies the rules of another set, without ids', () => {
    expect(createBody('Provider C v2', LEGACY, '')).toEqual({
      name: 'Provider C v2',
      sheetRules: LEGACY_SHEETS,
      columnRules: LEGACY_COLUMNS,
    })
  })
})

describe('fields adapted to the kind of sheet', () => {
  it('batch_fees and ignore have no cycle nor status', () => {
    const values = valuesOf(LEGACY)
    values.sheetRules[2] = { ...values.sheetRules[2]!, kind: 'batch_fees' }
    expect(rulesOf(values).sheetRules[2]).toMatchObject({ kind: 'batch_fees', cycle: null, statusId: null })
  })

  it('cycle R has no status', () => {
    const values = valuesOf(LEGACY)
    values.sheetRules[2] = { ...values.sheetRules[2]!, cycle: 'R' }
    expect(rulesOf(values).sheetRules[2]).toMatchObject({ cycle: 'R', statusId: null })
  })

  it('a column for any sheet travels as sheetPattern null', () => {
    const values = valuesOf(LEGACY)
    values.columnRules[0] = { ...values.columnRules[0]!, sheetPattern: '   ' }
    expect(rulesOf(values).columnRules[0]?.sheetPattern).toBeNull()
    values.columnRules[0] = { ...values.columnRules[0]!, sheetPattern: ' CB ' }
    expect(rulesOf(values).columnRules[0]?.sheetPattern).toBe('CB')
  })

  it('new rows have the defaults of design D5', () => {
    expect(newSheetRule()).toMatchObject({
      kind: 'transactions',
      cycle: 'E',
      statusId: '',
      priority: '100',
      isActive: true,
    })
    expect(newColumnRule()).toMatchObject({ sheetPattern: '', priority: '100', isActive: true })
    expect(newStatusAlias()).toMatchObject({ statusId: '', excludeAmount: false, isLegacy: false })
  })
})

describe('checkRules: what the schemas reject', () => {
  it('a blank or too long pattern, at the path details.field would use', () => {
    const values = valuesOf(LEGACY)
    values.sheetRules[1] = { ...values.sheetRules[1]!, sheetPattern: '   ' }
    values.columnRules[2] = { ...values.columnRules[2]!, columnPattern: 'x'.repeat(129) }
    expect(checkRules(values)).toEqual({
      ok: false,
      fields: {
        'sheetRules[1].sheetPattern': m.pattern,
        'columnRules[2].columnPattern': m.tooLong(128),
      },
    })
  })

  it.each(['-1', '32768', '1.5', 'abc', ''])('priority %j is not a whole number from 0 to 32767', (priority) => {
    const values = valuesOf(LEGACY)
    values.sheetRules[0] = { ...values.sheetRules[0]!, priority }
    expect(checkRules(values)).toEqual({ ok: false, fields: { 'sheetRules[0].priority': m.priority } })
  })

  it('an alias needs its text and a status', () => {
    const values = valuesOf(GLOBALS)
    values.statusAliases.push(newStatusAlias())
    expect(checkRules(values)).toEqual({
      ok: false,
      fields: { 'statusAliases[1].alias': m.aliasText, 'statusAliases[1].statusId': m.status },
    })
  })
})

describe('checkRules: what the API decides', () => {
  it('does not reject a regex that does not compile, repeated patterns, Pending, a status of another cycle or a transactions sheet without cycle', () => {
    const values = valuesOf(LEGACY)
    values.columnRules[0] = { ...values.columnRules[0]!, columnPattern: '^amount(', isRegex: true }
    values.sheetRules[0] = { ...values.sheetRules[0]!, sheetPattern: 'APP', statusId: '4' }
    values.sheetRules[1] = { ...values.sheetRules[1]!, sheetPattern: ' app ', cycle: 'E', statusId: '1' }
    values.sheetRules[2] = { ...values.sheetRules[2]!, cycle: '' }

    const rules = rulesOf(values)
    expect(rules.columnRules[0]).toMatchObject({ columnPattern: '^amount(', isRegex: true })
    expect(rules.sheetRules[0]).toMatchObject({ sheetPattern: 'APP', cycle: 'E', statusId: 4 })
    expect(rules.sheetRules[1]).toMatchObject({ sheetPattern: 'app', statusId: 1 })
    expect(rules.sheetRules[2]).toMatchObject({ kind: 'transactions', cycle: null })
  })
})
