import type { ColumnRuleInput, SheetRuleInput, StatusAliasInput } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { MatchingRuleError } from './errors.js'
import { validateAliases, validateColumnRules, validateSheetRules } from './rule-validation.js'
import type { StatusCatalogEntry } from './rules.js'

// admin-matching design D2; spec matching "Validación del contenido de las reglas", "Patrones sin repetir y límites"
// and "Reglas globales editables" (aliases).

const STATUSES: StatusCatalogEntry[] = [
  { statusId: 1, name: 'Pending', cycle: 'E' },
  { statusId: 2, name: 'Successful', cycle: 'E' },
  { statusId: 3, name: 'Declined', cycle: 'E' },
  { statusId: 4, name: 'Chargeback', cycle: 'I' },
  { statusId: 5, name: 'Refund', cycle: 'I' },
  { statusId: 6, name: 'RDR', cycle: 'I' },
]

const sheet = (overrides: Partial<SheetRuleInput> = {}): SheetRuleInput => ({
  sheetPattern: 'APP',
  isRegex: false,
  kind: 'transactions',
  cycle: 'E',
  statusId: null,
  priority: 100,
  isActive: true,
  ...overrides,
})

const column = (overrides: Partial<ColumnRuleInput> = {}): ColumnRuleInput => ({
  sheetPattern: null,
  columnPattern: 'ID',
  isRegex: false,
  targetField: 'transactionId',
  priority: 100,
  isActive: true,
  ...overrides,
})

const alias = (overrides: Partial<StatusAliasInput> = {}): StatusAliasInput => ({
  alias: 'Successful',
  statusId: 2,
  excludeAmount: false,
  isLegacy: false,
  ...overrides,
})

/** The field the error points at, or null when the call does not throw. */
function fieldOf(run: () => void): string | null {
  try {
    run()
    return null
  } catch (error) {
    if (!(error instanceof MatchingRuleError)) throw error
    expect(error.status).toBe(400)
    expect(error.code).toBe('validation_error')
    return error.details.field
  }
}

describe('validateSheetRules', () => {
  it('accepts the template sheets: transactions with and without a fixed status, R without status, fees, ignore', () => {
    const rules = [
      sheet({ sheetPattern: 'APP', statusId: 2 }),
      sheet({ sheetPattern: 'CHB', cycle: 'I', statusId: 4 }),
      sheet({ sheetPattern: 'TRX', statusId: null }),
      sheet({ sheetPattern: 'RR', cycle: 'R' }),
      sheet({ sheetPattern: 'Other Fees', kind: 'batch_fees', cycle: null }),
      sheet({ sheetPattern: 'Settings', kind: 'ignore', cycle: null }),
      sheet({ sheetPattern: '^Fee.*$', isRegex: true, kind: 'batch_fees', cycle: null }),
    ]

    expect(fieldOf(() => validateSheetRules(rules, STATUSES))).toBeNull()
  })

  it('accepts an empty list', () => {
    expect(fieldOf(() => validateSheetRules([], STATUSES))).toBeNull()
  })

  it('rejects a transactions sheet without cycle, at its cycle', () => {
    expect(fieldOf(() => validateSheetRules([sheet({ cycle: null })], STATUSES))).toBe('sheetRules[0].cycle')
  })

  it.each(['batch_fees', 'ignore'] as const)('rejects a %s sheet with a cycle, at its cycle', (kind) => {
    const rules = [sheet(), sheet({ sheetPattern: 'Other Fees', kind, cycle: 'E' })]

    expect(fieldOf(() => validateSheetRules(rules, STATUSES))).toBe('sheetRules[1].cycle')
  })

  it.each(['batch_fees', 'ignore'] as const)('rejects a %s sheet with a status, at its statusId', (kind) => {
    expect(fieldOf(() => validateSheetRules([sheet({ kind, cycle: null, statusId: 2 })], STATUSES))).toBe(
      'sheetRules[0].statusId',
    )
  })

  it('rejects cycle R with a status, at its statusId', () => {
    const rules = [sheet(), sheet({ sheetPattern: 'RR', cycle: 'R', statusId: 2 })]

    expect(fieldOf(() => validateSheetRules(rules, STATUSES))).toBe('sheetRules[1].statusId')
  })

  it('rejects a fixed status of another natural cycle (APP → E/Chargeback), at its statusId', () => {
    expect(fieldOf(() => validateSheetRules([sheet({ statusId: 4 })], STATUSES))).toBe('sheetRules[0].statusId')
    expect(fieldOf(() => validateSheetRules([sheet({ cycle: 'I', statusId: 2 })], STATUSES))).toBe(
      'sheetRules[0].statusId',
    )
  })

  it('rejects Pending as a fixed status, at its statusId', () => {
    expect(fieldOf(() => validateSheetRules([sheet({ statusId: 1 })], STATUSES))).toBe('sheetRules[0].statusId')
  })

  it('rejects an unknown status, at its statusId', () => {
    expect(fieldOf(() => validateSheetRules([sheet({ statusId: 99 })], STATUSES))).toBe('sheetRules[0].statusId')
  })

  it('rejects a regex that does not compile, at its sheetPattern', () => {
    const rules = [sheet(), sheet({ sheetPattern: '^APP(', isRegex: true })]

    expect(fieldOf(() => validateSheetRules(rules, STATUSES))).toBe('sheetRules[1].sheetPattern')
  })

  it('accepts as plain text a pattern that would not compile as a regex', () => {
    expect(fieldOf(() => validateSheetRules([sheet({ sheetPattern: '^APP(' })], STATUSES))).toBeNull()
  })

  it('points at the second of two repeated sheets, ignoring case and surrounding spaces', () => {
    const rules = [sheet({ sheetPattern: 'APP' }), sheet({ sheetPattern: 'DEC' }), sheet({ sheetPattern: ' app ' })]

    expect(fieldOf(() => validateSheetRules(rules, STATUSES))).toBe('sheetRules[2].sheetPattern')
  })

  it('treats a regex and a plain pattern with the same text as repeated', () => {
    const rules = [sheet({ sheetPattern: 'APP' }), sheet({ sheetPattern: 'app', isRegex: true })]

    expect(fieldOf(() => validateSheetRules(rules, STATUSES))).toBe('sheetRules[1].sheetPattern')
  })

  it('reports the first broken rule, and the shape before the status of the same rule', () => {
    const rules = [
      sheet(),
      sheet({ kind: 'ignore', cycle: 'E', statusId: 99, sheetPattern: 'X' }),
      sheet({ cycle: null }),
    ]

    expect(fieldOf(() => validateSheetRules(rules, STATUSES))).toBe('sheetRules[1].cycle')
  })

  it('validates inactive rules too: they are saved and may be activated later', () => {
    expect(fieldOf(() => validateSheetRules([sheet({ statusId: 1, isActive: false })], STATUSES))).toBe(
      'sheetRules[0].statusId',
    )
  })
})

describe('validateColumnRules', () => {
  it('accepts the template columns, generic and sheet-bound', () => {
    const rules = [
      column(),
      column({ columnPattern: 'Amount', targetField: 'amount' }),
      column({ columnPattern: 'Currency', targetField: 'currency' }),
      column({ sheetPattern: 'TRX', columnPattern: 'Order Status', targetField: 'status' }),
    ]

    expect(fieldOf(() => validateColumnRules(rules))).toBeNull()
  })

  it('accepts the same column for any sheet and for one sheet: the sheet–column pair differs', () => {
    const rules = [
      column({ columnPattern: 'Amount', targetField: 'amount' }),
      column({ sheetPattern: 'CB', columnPattern: 'Amount', targetField: 'amount' }),
    ]

    expect(fieldOf(() => validateColumnRules(rules))).toBeNull()
  })

  it('points at the second of two repeated sheet–column pairs, ignoring case, spaces and isRegex', () => {
    const rules = [
      column({ sheetPattern: 'CB', columnPattern: 'Amount', targetField: 'amount' }),
      column(),
      column({ sheetPattern: ' cb', columnPattern: 'AMOUNT ', isRegex: true, targetField: 'currency' }),
    ]

    expect(fieldOf(() => validateColumnRules(rules))).toBe('columnRules[2].columnPattern')
  })

  it('treats two generic rules with the same column as repeated', () => {
    expect(fieldOf(() => validateColumnRules([column(), column({ columnPattern: 'id' })]))).toBe(
      'columnRules[1].columnPattern',
    )
  })

  it('rejects a column regex that does not compile, at its columnPattern', () => {
    expect(fieldOf(() => validateColumnRules([column({ columnPattern: '^amount(', isRegex: true })]))).toBe(
      'columnRules[0].columnPattern',
    )
  })

  it('rejects a sheet regex of a column rule that does not compile, at its sheetPattern', () => {
    expect(
      fieldOf(() => validateColumnRules([column({ sheetPattern: '[CB', columnPattern: 'ID', isRegex: true })])),
    ).toBe('columnRules[0].sheetPattern')
  })
})

describe('validateAliases', () => {
  it('accepts the seeded aliases, a legacy one with excludeAmount included', () => {
    const aliases = [alias(), alias({ alias: 'CHB 2', statusId: 4, excludeAmount: true, isLegacy: true })]

    expect(fieldOf(() => validateAliases(aliases, STATUSES))).toBeNull()
  })

  it('accepts an alias of Pending: a status column may say Pending even if a sheet may not fix it', () => {
    expect(fieldOf(() => validateAliases([alias({ alias: 'Waiting', statusId: 1 })], STATUSES))).toBeNull()
  })

  it('points at the second of two repeated aliases, ignoring case and surrounding spaces', () => {
    const aliases = [alias({ alias: 'CHB', statusId: 4 }), alias(), alias({ alias: ' chb ', statusId: 4 })]

    expect(fieldOf(() => validateAliases(aliases, STATUSES))).toBe('statusAliases[2].alias')
  })

  it('rejects an alias of an unknown status, at its statusId', () => {
    expect(fieldOf(() => validateAliases([alias(), alias({ alias: 'Lost', statusId: 99 })], STATUSES))).toBe(
      'statusAliases[1].statusId',
    )
  })
})
