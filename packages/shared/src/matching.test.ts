import { describe, expect, it } from 'vitest'
import {
  ColumnRuleInput,
  GlobalMatchingRules,
  GlobalMatchingRulesPut,
  MatchingRuleSetCreate,
  MatchingRuleSetDetail,
  MatchingRuleSetPut,
  SheetRuleInput,
  StatusAliasInput,
} from './matching.js'

const sheetRule = { sheetPattern: 'APP', isRegex: false, kind: 'transactions', cycle: 'E', statusId: 2 }
const columnRule = { sheetPattern: null, columnPattern: 'ID', isRegex: false, targetField: 'transactionId' }
const alias = { alias: 'CHB 2', statusId: 4, excludeAmount: true, isLegacy: true }
const account = { accountId: '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f', name: 'ProviderC-Alt', isActive: true }
const rowIgnore = {
  rowIgnoreId: 1,
  pattern: 'transactionId:empty',
  isRegex: false,
  description: 'Total rows (=SUM) and blank rows: no ID, no row',
  isActive: true,
}

describe('SheetRuleInput', () => {
  it('trims the pattern and defaults priority and isActive', () => {
    expect(SheetRuleInput.parse({ ...sheetRule, sheetPattern: '  APP ' })).toEqual({
      ...sheetRule,
      priority: 100,
      isActive: true,
    })
  })

  it('rejects a pattern empty after trimming or longer than 128 characters', () => {
    expect(SheetRuleInput.safeParse({ ...sheetRule, sheetPattern: '   ' }).success).toBe(false)
    expect(SheetRuleInput.safeParse({ ...sheetRule, sheetPattern: 'x'.repeat(128) }).success).toBe(true)
    expect(SheetRuleInput.safeParse({ ...sheetRule, sheetPattern: 'x'.repeat(129) }).success).toBe(false)
  })

  it('rejects an unknown kind and a priority out of range', () => {
    expect(SheetRuleInput.safeParse({ ...sheetRule, kind: 'summary' }).success).toBe(false)
    expect(SheetRuleInput.safeParse({ ...sheetRule, priority: -1 }).success).toBe(false)
    expect(SheetRuleInput.safeParse({ ...sheetRule, priority: 32_768 }).success).toBe(false)
  })

  it('leaves the kind–cycle–status coherence to the domain (D2): the shape alone is accepted', () => {
    expect(SheetRuleInput.safeParse({ ...sheetRule, kind: 'batch_fees', cycle: 'E' }).success).toBe(true)
  })
})

describe('ColumnRuleInput', () => {
  it('takes sheetPattern as null or a trimmed pattern', () => {
    expect(ColumnRuleInput.safeParse(columnRule).success).toBe(true)
    expect(ColumnRuleInput.parse({ ...columnRule, sheetPattern: ' CB ' }).sheetPattern).toBe('CB')
  })

  it('rejects a target field outside the vocabulary', () => {
    expect(ColumnRuleInput.safeParse({ ...columnRule, targetField: 'fee' }).success).toBe(false)
  })
})

describe('StatusAliasInput', () => {
  it('trims the alias and bounds it to 1–50 characters', () => {
    expect(StatusAliasInput.parse({ ...alias, alias: ' CHB 2 ' }).alias).toBe('CHB 2')
    expect(StatusAliasInput.safeParse({ ...alias, alias: ' ' }).success).toBe(false)
    expect(StatusAliasInput.safeParse({ ...alias, alias: 'x'.repeat(51) }).success).toBe(false)
  })
})

describe('MatchingRuleSetCreate', () => {
  it('needs only a name; the rule lists default to empty', () => {
    expect(MatchingRuleSetCreate.parse({ name: ' Provider C v2 ' })).toEqual({
      name: 'Provider C v2',
      sheetRules: [],
      columnRules: [],
    })
  })

  it('bounds the name to 80 characters', () => {
    expect(MatchingRuleSetCreate.safeParse({ name: 'x'.repeat(80) }).success).toBe(true)
    expect(MatchingRuleSetCreate.safeParse({ name: 'x'.repeat(81) }).success).toBe(false)
  })

  it('rejects providerId and rowIgnoreRules: unknown fields are a 400', () => {
    expect(MatchingRuleSetCreate.safeParse({ name: 'x', providerId: 201 }).success).toBe(false)
    expect(MatchingRuleSetCreate.safeParse({ name: 'x', rowIgnoreRules: [] }).success).toBe(false)
  })

  it('accepts up to 200 rules per list', () => {
    const rules = (n: number) => Array.from({ length: n }, (_, i) => ({ ...columnRule, columnPattern: `C${i}` }))
    expect(MatchingRuleSetCreate.safeParse({ name: 'x', columnRules: rules(200) }).success).toBe(true)
    expect(MatchingRuleSetCreate.safeParse({ name: 'x', columnRules: rules(201) }).success).toBe(false)
  })
})

describe('MatchingRuleSetPut', () => {
  const body = { name: 'Provider C legacy', isActive: true, sheetRules: [sheetRule], columnRules: [columnRule] }

  it('takes the whole document, with an optional trimmed reason', () => {
    expect(MatchingRuleSetPut.safeParse(body).success).toBe(true)
    expect(MatchingRuleSetPut.parse({ ...body, reason: ' New layout ' }).reason).toBe('New layout')
    expect(MatchingRuleSetPut.safeParse({ ...body, reason: ' ' }).success).toBe(false)
    expect(MatchingRuleSetPut.safeParse({ ...body, reason: 'x'.repeat(501) }).success).toBe(false)
  })

  it('rejects a partial body', () => {
    const { columnRules: _, ...partial } = body
    expect(MatchingRuleSetPut.safeParse(partial).success).toBe(false)
    const { isActive: __, ...withoutFlag } = body
    expect(MatchingRuleSetPut.safeParse(withoutFlag).success).toBe(false)
  })

  it('rejects a rule id inside a rule: ids are never kept across a replacement', () => {
    expect(MatchingRuleSetPut.safeParse({ ...body, sheetRules: [{ ...sheetRule, sheetRuleId: 7 }] }).success).toBe(
      false,
    )
  })
})

describe('GlobalMatchingRulesPut', () => {
  const body = { sheetRules: [sheetRule], columnRules: [columnRule], statusAliases: [alias] }

  it('takes sheet rules, column rules and aliases', () => {
    expect(GlobalMatchingRulesPut.safeParse(body).success).toBe(true)
  })

  it('rejects rowIgnoreRules and statuses: they are read-only', () => {
    expect(GlobalMatchingRulesPut.safeParse({ ...body, rowIgnoreRules: [] }).success).toBe(false)
    expect(GlobalMatchingRulesPut.safeParse({ ...body, statuses: [] }).success).toBe(false)
  })
})

describe('MatchingRuleSetDetail', () => {
  it('carries the provider, the linked accounts and every rule with its id', () => {
    const detail = {
      ruleSetId: 1,
      name: 'Provider C legacy',
      isActive: true,
      provider: { providerId: 201, name: 'Provider C' },
      accounts: [account],
      sheetRules: [{ ...sheetRule, sheetRuleId: 11, priority: 10, isActive: true }],
      columnRules: [{ ...columnRule, columnRuleId: 21, priority: 5, isActive: true }],
      rowIgnoreRules: [rowIgnore],
    }
    expect(MatchingRuleSetDetail.safeParse(detail).success).toBe(true)
    expect(MatchingRuleSetDetail.safeParse({ ...detail, sheetRules: [{ ...sheetRule, priority: 10 }] }).success).toBe(
      false,
    )
  })
})

describe('GlobalMatchingRules', () => {
  it('carries the global rules, the read-only row ignores, the aliases and the status catalog', () => {
    const globals = {
      sheetRules: [{ ...sheetRule, sheetRuleId: 1, priority: 10, isActive: true }],
      columnRules: [{ ...columnRule, columnRuleId: 1, priority: 10, isActive: true }],
      rowIgnoreRules: [{ ...rowIgnore, description: null }],
      statusAliases: [alias],
      statuses: [{ statusId: 2, name: 'Successful', cycle: 'E' }],
    }
    expect(GlobalMatchingRules.safeParse(globals).success).toBe(true)
    expect(
      GlobalMatchingRules.safeParse({ ...globals, statuses: [{ statusId: 2, name: 'x', cycle: 'X' }] }).success,
    ).toBe(false)
  })
})
