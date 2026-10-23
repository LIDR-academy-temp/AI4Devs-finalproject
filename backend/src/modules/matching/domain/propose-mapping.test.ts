import { describe, expect, it } from 'vitest'
import {
  BATCH_CLEAN_WORKBOOK,
  GLOBAL_RULES,
  LEGACY_WORKBOOK,
  RULES_FOR_PROVIDER_A,
  RULES_FOR_PROVIDER_C,
  sheet,
} from '../../imports/application/__fakes__/in-memory.js'
import { proposeMapping } from './propose-mapping.js'
import type { ColumnRule, MatchingRules, SheetRule } from './rules.js'

const TEMPLATE_COLUMNS = [
  { sourceColumn: 'ID', targetField: 'transactionId', source: 'global' },
  { sourceColumn: 'Amount', targetField: 'amount', source: 'global' },
  { sourceColumn: 'Currency', targetField: 'currency', source: 'global' },
]

function sheetNamed(proposal: ReturnType<typeof proposeMapping>, name: string) {
  const found = proposal.sheets.find((s) => s.sheetName === name)
  if (!found) throw new Error(`sheet ${name} not proposed`)
  return found
}

function withGlobalRules(overrides: { sheetRules?: SheetRule[]; columnRules?: ColumnRule[] }): MatchingRules {
  return {
    ...RULES_FOR_PROVIDER_A,
    global: {
      ...GLOBAL_RULES,
      sheetRules: overrides.sheetRules ?? GLOBAL_RULES.sheetRules,
      columnRules: overrides.columnRules ?? GLOBAL_RULES.columnRules,
    },
  }
}

describe('proposeMapping with the global rules (batch-clean on ProviderA-USD)', () => {
  const proposal = proposeMapping(BATCH_CLEAN_WORKBOOK, RULES_FOR_PROVIDER_A)

  it.each([
    ['APP', 'transactions', 'E', 2, 'Successful'],
    ['DEC', 'transactions', 'E', 3, 'Declined'],
    ['CHB', 'transactions', 'I', 4, 'Chargeback'],
    ['REF', 'transactions', 'I', 5, 'Refund'],
    ['RDR', 'transactions', 'I', 6, 'RDR'],
    ['RR', 'transactions', 'R', null, null],
    ['Other Fees', 'batch_fees', null, null, null],
  ])('proposes %s as %s / %s / %s from a global rule', (name, kind, cycle, statusId, statusName) => {
    expect(sheetNamed(proposal, name).proposed).toEqual({ kind, cycle, statusId, statusName, source: 'global' })
  })

  it.each(['Duplicate Corrections', 'CHB Alerts', 'Settings'])('proposes %s as ignore with a note', (name) => {
    const proposed = sheetNamed(proposal, name).proposed
    expect(proposed).toMatchObject({ kind: 'ignore', cycle: null, statusId: null, statusName: null, source: 'global' })
    expect(proposed.note).toContain(name)
  })

  it('maps ID, Amount and Currency on every transactions sheet and Type of Fee on Other Fees', () => {
    for (const name of ['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR']) {
      expect(sheetNamed(proposal, name).columns, name).toEqual(TEMPLATE_COLUMNS)
    }
    expect(sheetNamed(proposal, 'Other Fees').columns).toEqual([
      { sourceColumn: 'Type of Fee', targetField: 'feeType', source: 'global' },
      { sourceColumn: 'Amount', targetField: 'amount', source: 'global' },
      { sourceColumn: 'Currency', targetField: 'currency', source: 'global' },
    ])
  })

  it('still proposes the columns of an ignored sheet so that it can be reclassified', () => {
    expect(sheetNamed(proposal, 'Duplicate Corrections').columns).toEqual([
      { sourceColumn: 'ID', targetField: 'transactionId', source: 'global' },
      { sourceColumn: 'Status', targetField: 'status', source: 'global', statusValues: [] },
      { sourceColumn: 'Amount', targetField: 'amount', source: 'global' },
    ])
  })

  it('keeps the sheets in workbook order', () => {
    expect(proposal.sheets.map((s) => s.sheetName)).toEqual(BATCH_CLEAN_WORKBOOK.sheets.map((s) => s.name))
  })
})

describe('proposeMapping with the legacy rule set (legacy-provider on ProviderC-Alt)', () => {
  const proposal = proposeMapping(LEGACY_WORKBOOK, RULES_FOR_PROVIDER_C)

  it.each([
    ['TRX', 'transactions', 'E', null, null],
    ['Fail', 'transactions', 'E', 3, 'Declined'],
    ['CB', 'transactions', 'I', null, null],
    ['Summary', 'ignore', null, null, null],
  ])('proposes %s as %s / %s / %s from the account rule set', (name, kind, cycle, statusId, statusName) => {
    expect(sheetNamed(proposal, name).proposed).toMatchObject({ kind, cycle, statusId, statusName, source: 'account' })
  })

  it('maps the legacy columns from the account rule set, even those that also have a global rule', () => {
    const columns = sheetNamed(proposal, 'TRX').columns.map(({ statusValues: _, ...c }) => c)
    expect(columns).toEqual([
      { sourceColumn: 'Merchant Order No#', targetField: 'transactionId', source: 'account' },
      { sourceColumn: 'Order Status', targetField: 'status', source: 'account' },
      { sourceColumn: 'Amount USD', targetField: 'amount', source: 'account' },
    ])
  })

  it('resolves the distinct values of every status column through the aliases', () => {
    const statusValues = (name: string) => sheetNamed(proposal, name).columns[1]?.statusValues
    expect(statusValues('CB')).toEqual([{ value: 'CHB 2', statusId: 4, statusName: 'Chargeback', excludeAmount: true }])
    expect(statusValues('TRX')).toEqual([
      { value: 'Successful', statusId: 2, statusName: 'Successful', excludeAmount: false },
    ])
    expect(statusValues('Fail')).toEqual([
      { value: 'Failed', statusId: 3, statusName: 'Declined', excludeAmount: false },
    ])
  })
})

describe('proposeMapping: pattern matching and precedence', () => {
  it('matches sheet names ignoring case and surrounding spaces', () => {
    const workbook = {
      sheets: [
        sheet('app', ['ID'], 1, [['1']], [{ distinctValues: ['1'], numericCells: 0, lossyNumericCells: 0 }]),
        sheet(' DEC ', ['ID'], 1, [['1']], [{ distinctValues: ['1'], numericCells: 0, lossyNumericCells: 0 }]),
        sheet('Other fees', ['Type of Fee'], 0, [], [{ distinctValues: [], numericCells: 0, lossyNumericCells: 0 }]),
      ],
    }

    const proposal = proposeMapping(workbook, RULES_FOR_PROVIDER_A)

    expect(sheetNamed(proposal, 'app').proposed).toMatchObject({
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
      source: 'global',
    })
    expect(sheetNamed(proposal, ' DEC ').proposed).toMatchObject({ cycle: 'E', statusId: 3, source: 'global' })
    expect(sheetNamed(proposal, 'Other fees').proposed).toMatchObject({ kind: 'batch_fees', source: 'global' })
  })

  it('applies a regex column rule, case-insensitively', () => {
    const rules = withGlobalRules({
      columnRules: [
        {
          columnRuleId: 900,
          sheetPattern: null,
          columnPattern: '^amount( usd)?$',
          isRegex: true,
          targetField: 'amount',
          priority: 10,
          isActive: true,
        },
      ],
    })
    const workbook = { sheets: [sheet('APP', ['Amount', 'Amount USD', 'Amounts'], 0, [], [])] }

    const columns = sheetNamed(proposeMapping(workbook, rules), 'APP').columns

    expect(columns[0]).toEqual({ sourceColumn: 'Amount', targetField: 'amount', source: 'global' })
    // The second match loses: one target field per sheet, the leftmost column wins.
    expect(columns[1]).toEqual({ sourceColumn: 'Amount USD', targetField: null, source: 'none' })
    expect(columns[2]).toEqual({ sourceColumn: 'Amounts', targetField: null, source: 'none' })
  })

  it('proposes nothing (source none) for a sheet or a header without any matching rule', () => {
    const workbook = { sheets: [sheet('Bonus', ['Reference', 'Importe'], 2, [['x', '1']], [])] }

    const bonus = sheetNamed(proposeMapping(workbook, RULES_FOR_PROVIDER_A), 'Bonus')

    expect(bonus.proposed).toEqual({ kind: null, cycle: null, statusId: null, statusName: null, source: 'none' })
    expect(bonus.columns).toEqual([
      { sourceColumn: 'Reference', targetField: null, source: 'none' },
      { sourceColumn: 'Importe', targetField: null, source: 'none' },
    ])
  })

  it('proposes each target field at most once per sheet: the leftmost column wins', () => {
    const workbook = { sheets: [sheet('APP', ['ID', 'Transaction ID', 'Amount'], 0, [], [])] }

    const columns = sheetNamed(proposeMapping(workbook, RULES_FOR_PROVIDER_A), 'APP').columns

    expect(columns).toEqual([
      { sourceColumn: 'ID', targetField: 'transactionId', source: 'global' },
      { sourceColumn: 'Transaction ID', targetField: null, source: 'none' },
      { sourceColumn: 'Amount', targetField: 'amount', source: 'global' },
    ])
  })

  it('prefers the account rule over a global rule for the same pattern, whatever their priorities', () => {
    const rules: MatchingRules = {
      ...RULES_FOR_PROVIDER_C,
      account: {
        ...RULES_FOR_PROVIDER_C.account!,
        columnRules: RULES_FOR_PROVIDER_C.account!.columnRules.map((r) => ({ ...r, priority: 999 })),
      },
    }
    const workbook = { sheets: [sheet('TRX', ['Merchant Order No#'], 0, [], [])] }

    expect(sheetNamed(proposeMapping(workbook, rules), 'TRX').columns[0]).toEqual({
      sourceColumn: 'Merchant Order No#',
      targetField: 'transactionId',
      source: 'account',
    })
  })

  it('lets the lowest priority win among matching rules of the same source, and ignores inactive rules', () => {
    const lowPriority: SheetRule = {
      sheetRuleId: 901,
      sheetPattern: 'APP',
      isRegex: false,
      kind: 'ignore',
      cycle: null,
      statusId: null,
      priority: 5,
      isActive: true,
    }
    const inactive: SheetRule = { ...lowPriority, sheetRuleId: 902, priority: 1, kind: 'batch_fees', isActive: false }
    const rules = withGlobalRules({ sheetRules: [...GLOBAL_RULES.sheetRules, lowPriority, inactive] })
    const workbook = { sheets: [sheet('APP', ['ID'], 0, [], [])] }

    expect(sheetNamed(proposeMapping(workbook, rules), 'APP').proposed).toMatchObject({
      kind: 'ignore',
      source: 'global',
    })
  })

  it('applies a column rule restricted to a sheet pattern only on that sheet, before a generic one', () => {
    const specific: ColumnRule = {
      columnRuleId: 903,
      sheetPattern: 'Other Fees',
      columnPattern: 'Amount',
      isRegex: false,
      targetField: 'reference',
      priority: 10,
      isActive: true,
    }
    const rules = withGlobalRules({ columnRules: [...GLOBAL_RULES.columnRules, specific] })
    const workbook = { sheets: [sheet('Other Fees', ['Amount'], 0, [], []), sheet('APP', ['Amount'], 0, [], [])] }

    const proposal = proposeMapping(workbook, rules)

    expect(sheetNamed(proposal, 'Other Fees').columns[0]).toMatchObject({ targetField: 'reference', source: 'global' })
    expect(sheetNamed(proposal, 'APP').columns[0]).toMatchObject({ targetField: 'amount', source: 'global' })
  })

  it('omits statusValues when the status column has more distinct values than the reader tracks', () => {
    const workbook = {
      sheets: [
        sheet(
          'CB',
          ['Merchant Order No#', 'Order Status'],
          100,
          [],
          [
            { distinctValues: null, numericCells: 0, lossyNumericCells: 0 },
            { distinctValues: null, numericCells: 0, lossyNumericCells: 0 },
          ],
        ),
      ],
    }

    const column = sheetNamed(proposeMapping(workbook, RULES_FOR_PROVIDER_C), 'CB').columns[1]

    expect(column).toEqual({ sourceColumn: 'Order Status', targetField: 'status', source: 'account' })
  })
})
