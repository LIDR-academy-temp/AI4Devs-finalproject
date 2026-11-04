// The matching rules of the seed's synthetic world (backend/prisma/synthetic.ts; README §3.2 "Reglas de pareo"), for
// the fake of matching.ts and the account forms of accounts.ts (web-admin-matching design D10). The fake copies them
// per test, so a write never leaks into the next one.
import type { ColumnRule, MatchingStatus, RowIgnoreRule, SheetRule, StatusAlias } from '@recon/shared'

/** The rule sets of the fake: Provider C legacy is the one of the seed; the retired one is inactive. */
export const RULE_SET_IDS = { legacy: 3, retired: 4 } as const

export interface RuleSetRow {
  ruleSetId: number
  providerId: number
  name: string
  isActive: boolean
  sheetRules: SheetRule[]
  columnRules: ColumnRule[]
  rowIgnoreRules: RowIgnoreRule[]
}

export interface GlobalRules {
  sheetRules: SheetRule[]
  columnRules: ColumnRule[]
  rowIgnoreRules: RowIgnoreRule[]
  statusAliases: StatusAlias[]
}

export const STATUSES: MatchingStatus[] = [
  { statusId: 1, name: 'Pending', cycle: 'E' },
  { statusId: 2, name: 'Successful', cycle: 'E' },
  { statusId: 3, name: 'Declined', cycle: 'E' },
  { statusId: 4, name: 'Chargeback', cycle: 'I' },
  { statusId: 5, name: 'Refund', cycle: 'I' },
  { statusId: 6, name: 'RDR', cycle: 'I' },
]

type Sheet = Pick<SheetRule, 'sheetPattern' | 'kind' | 'cycle' | 'statusId'> & Partial<SheetRule>
type Column = Pick<ColumnRule, 'sheetPattern' | 'columnPattern' | 'targetField'> & Partial<ColumnRule>

const sheet = (sheetRuleId: number, rule: Sheet): SheetRule => ({
  sheetRuleId,
  isRegex: false,
  priority: 10,
  isActive: true,
  ...rule,
})

const column = (columnRuleId: number, rule: Column): ColumnRule => ({
  columnRuleId,
  isRegex: false,
  priority: 10,
  isActive: true,
  ...rule,
})

const transactions = (sheetPattern: string, cycle: 'E' | 'I' | 'R', statusId: number | null) =>
  ({ sheetPattern, kind: 'transactions', cycle, statusId }) as const
const ignore = (sheetPattern: string) => ({ sheetPattern, kind: 'ignore', cycle: null, statusId: null }) as const

export const RULE_SETS: readonly RuleSetRow[] = [
  {
    ruleSetId: RULE_SET_IDS.legacy,
    providerId: 201,
    name: 'Provider C legacy',
    isActive: true,
    sheetRules: [
      sheet(31, transactions('TRX', 'E', null)),
      sheet(32, transactions('CB', 'I', null)),
      sheet(33, transactions('Fail', 'E', 3)),
      sheet(34, ignore('Summary')),
    ],
    columnRules: [
      column(41, {
        sheetPattern: null,
        columnPattern: 'Merchant Order No#',
        targetField: 'transactionId',
        priority: 5,
      }),
      column(42, { sheetPattern: null, columnPattern: 'Order Status', targetField: 'status', priority: 5 }),
      column(43, { sheetPattern: null, columnPattern: 'Amount USD', targetField: 'amount', priority: 5 }),
    ],
    rowIgnoreRules: [],
  },
  {
    ruleSetId: RULE_SET_IDS.retired,
    providerId: 201,
    name: 'Provider C retired',
    isActive: false,
    sheetRules: [sheet(51, transactions('Transactions', 'E', null))],
    columnRules: [column(61, { sheetPattern: null, columnPattern: 'Txn Ref', targetField: 'transactionId' })],
    rowIgnoreRules: [],
  },
]

/** The global rules of the template (README §3.2), with the read-only row ignore rule and the aliases. */
export const GLOBAL_RULES: GlobalRules = {
  sheetRules: [
    sheet(1, transactions('APP', 'E', 2)),
    sheet(2, transactions('DEC', 'E', 3)),
    sheet(3, transactions('CHB', 'I', 4)),
    sheet(4, transactions('REF', 'I', 5)),
    sheet(5, transactions('RDR', 'I', 6)),
    sheet(6, transactions('RR', 'R', null)),
    sheet(7, { sheetPattern: 'Other Fees', kind: 'batch_fees', cycle: null, statusId: null }),
    sheet(8, ignore('Duplicate Corrections')),
    sheet(9, ignore('CHB Alerts')),
    sheet(10, ignore('Settings')),
  ],
  columnRules: [
    column(1, { sheetPattern: null, columnPattern: 'ID', targetField: 'transactionId' }),
    column(2, { sheetPattern: null, columnPattern: 'Amount', targetField: 'amount' }),
    column(3, { sheetPattern: null, columnPattern: 'Currency', targetField: 'currency' }),
    column(4, { sheetPattern: null, columnPattern: 'Type of Fee', targetField: 'feeType' }),
    column(5, { sheetPattern: null, columnPattern: 'Merchant Order No#', targetField: 'transactionId', priority: 20 }),
    column(6, { sheetPattern: null, columnPattern: 'Order Status', targetField: 'status', priority: 20 }),
  ],
  rowIgnoreRules: [
    {
      rowIgnoreId: 1,
      pattern: 'transactionId:empty',
      isRegex: false,
      description: 'Total rows (=SUM) and blank rows: no ID, no row',
      isActive: true,
    },
  ],
  statusAliases: [
    { alias: 'CHB 2', statusId: 4, excludeAmount: true, isLegacy: true },
    { alias: 'Chargeback', statusId: 4, excludeAmount: false, isLegacy: false },
    { alias: 'Declined', statusId: 3, excludeAmount: false, isLegacy: false },
    { alias: 'RDR', statusId: 6, excludeAmount: false, isLegacy: false },
    { alias: 'Refund', statusId: 5, excludeAmount: false, isLegacy: false },
    { alias: 'Successful', statusId: 2, excludeAmount: false, isLegacy: false },
  ],
}
