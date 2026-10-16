/**
 * In-memory doubles and fixtures of the import module. The rules come straight from the seed
 * (backend/prisma/synthetic.ts) so that tests and database never drift; the workbook descriptions
 * copy what the reader extracts from data/samples (sheet names, headers, row counts, first rows,
 * distinct values) so that the proposal can be tested without Excel.
 */
import type { Cycle, SheetKind, TargetField } from '@recon/shared'
import {
  GLOBAL_COLUMN_RULES,
  GLOBAL_SHEET_RULES,
  LEGACY_RULE_SET,
  STATUS_ALIASES,
  TRANSACTION_STATUSES,
} from '../../../../../prisma/synthetic.js'
import type { ColumnRule, MatchingRules, RuleSet, SheetRule } from '../../../matching/domain/rules.js'
import type { ColumnStats, SheetDescription, WorkbookDescription } from '../../domain/workbook.js'

// ───────────────────────── Rules from the seed ─────────────────────────

export const LEGACY_RULE_SET_ID = 1

interface SeedSheetRule {
  sheetPattern: string
  kind: string
  cycle: string | null
  statusId: number | null
  priority: number
}

interface SeedColumnRule {
  sheetPattern?: string | null
  columnPattern: string
  targetField: string
  priority: number
}

function sheetRules(rows: readonly SeedSheetRule[], offset: number): SheetRule[] {
  return rows.map((r, i) => ({
    sheetRuleId: offset + i + 1,
    sheetPattern: r.sheetPattern,
    isRegex: false,
    kind: r.kind as SheetKind,
    cycle: (r.cycle as Cycle | null) ?? null,
    statusId: r.statusId,
    priority: r.priority,
    isActive: true,
  }))
}

function columnRules(rows: readonly SeedColumnRule[], offset: number): ColumnRule[] {
  return rows.map((r, i) => ({
    columnRuleId: offset + i + 1,
    sheetPattern: r.sheetPattern ?? null,
    columnPattern: r.columnPattern,
    isRegex: false,
    targetField: r.targetField as TargetField,
    priority: r.priority,
    isActive: true,
  }))
}

export const GLOBAL_RULES: RuleSet = {
  ruleSetId: null,
  name: null,
  sheetRules: sheetRules(GLOBAL_SHEET_RULES, 0),
  columnRules: columnRules(GLOBAL_COLUMN_RULES, 0),
}

export const LEGACY_RULES: RuleSet = {
  ruleSetId: LEGACY_RULE_SET_ID,
  name: LEGACY_RULE_SET.name,
  sheetRules: sheetRules(LEGACY_RULE_SET.sheetRules, 100),
  columnRules: columnRules(LEGACY_RULE_SET.columnRules, 100),
}

const ALIASES = STATUS_ALIASES.map((a) => ({ alias: a.alias, statusId: a.statusId, excludeAmount: a.excludeAmount }))
const STATUSES = TRANSACTION_STATUSES.map((s) => ({ statusId: s.statusId, name: s.name, cycle: s.cycle as Cycle }))

/** ProviderA-USD and every account without a rule set: global rules only. */
export const RULES_FOR_PROVIDER_A: MatchingRules = {
  account: null,
  global: GLOBAL_RULES,
  aliases: ALIASES,
  statuses: STATUSES,
}

/** ProviderC-Alt: "Provider C legacy" first, then the global rules. */
export const RULES_FOR_PROVIDER_C: MatchingRules = {
  account: LEGACY_RULES,
  global: GLOBAL_RULES,
  aliases: ALIASES,
  statuses: STATUSES,
}

// ───────────────────────── Workbooks as the reader describes the samples ─────────────────────────

const HIGH_CARDINALITY: ColumnStats = { distinctValues: null, numericCells: 0, lossyNumericCells: 0 }

function stats(distinctValues: string[] | null, numericCells = 0, lossyNumericCells = 0): ColumnStats {
  return { distinctValues, numericCells, lossyNumericCells }
}

/** A template sheet (ID / Amount / Currency): IDs as text, amounts numeric, one currency. */
export function templateSheet(name: string, rowCount: number, preview: string[][]): SheetDescription {
  return {
    name,
    hidden: false,
    headers: ['ID', 'Amount', 'Currency'],
    rowCount,
    preview,
    columnStats: [
      rowCount > 50 ? HIGH_CARDINALITY : stats(preview.map((r) => r[0] ?? '').filter((v) => v !== '')),
      stats(null, rowCount, 0),
      stats(rowCount > 0 ? ['USD'] : []),
    ],
  }
}

export function sheet(
  name: string,
  headers: string[],
  rowCount: number,
  preview: string[][],
  columnStats: ColumnStats[],
  hidden = false,
): SheetDescription {
  return { name, hidden, headers, rowCount, preview, columnStats }
}

const TEMPLATE_TAIL = (otherFees: string[][]): SheetDescription[] => [
  sheet('Duplicate Corrections', ['ID', 'Status', 'Amount'], 0, [], [stats([]), stats([]), stats([])]),
  sheet('CHB Alerts', ['ID', 'Type of Fee'], 0, [], [stats([]), stats([])]),
  sheet('Other Fees', ['Type of Fee', 'Amount', 'Currency'], otherFees.length, otherFees, [
    stats(otherFees.map((r) => r[0] ?? '')),
    stats(null, otherFees.length),
    stats(otherFees.length ? ['USD'] : []),
  ]),
  sheet(
    'Settings',
    ['Chargeback Alert Fee Types', 'Column B', 'Non-Transactional Fees'],
    21,
    [
      ['Chargeback Alert Fee', '', 'Annual Fee'],
      ['Chargeback Alert Fee Ethoca', '', 'Bram Fine'],
      ['Chargeback Alert Fee RDR', '', 'Chargeback Assessment Fee'],
      ['', '', 'Chargeback Order Deduction'],
      ['', '', 'Chargeback over 1%'],
    ],
    [
      stats(['Chargeback Alert Fee', 'Chargeback Alert Fee Ethoca', 'Chargeback Alert Fee RDR']),
      stats([]),
      stats(null),
    ],
    true,
  ),
]

const OTHER_FEES_CLEAN = [
  ['Wire Fee', '25', 'USD'],
  ['Settlement Fee', '15', 'USD'],
]

/** data/samples/batch-clean: 340/110/3/7/3/320 transaction rows (783), two batch fees, Settings hidden. */
export const BATCH_CLEAN_WORKBOOK: WorkbookDescription = {
  sheets: [
    templateSheet('APP', 340, [['252570479111759', '16.22', 'USD']]),
    templateSheet('DEC', 110, [['699717315840756', '218.83', 'USD']]),
    templateSheet('CHB', 3, [
      ['535044421404059', '46.67', 'USD'],
      ['433236186559229', '147.19', 'USD'],
      ['', '', ''],
    ]),
    templateSheet('REF', 7, [['175616400979144', '71.01000000000001', 'USD']]),
    templateSheet('RDR', 3, [
      ['175186502472327', '89.78', 'USD'],
      ['', '', ''],
    ]),
    templateSheet('RR', 320, [['605317920155402', '2.27', 'USD']]),
    ...TEMPLATE_TAIL(OTHER_FEES_CLEAN),
  ],
}

/** data/samples/batch-split part1: the E sheets of batch-clean; everything else empty. */
export const BATCH_SPLIT_PART1: WorkbookDescription = {
  sheets: [
    templateSheet('APP', 340, [['252570479111759', '16.22', 'USD']]),
    templateSheet('DEC', 110, [['699717315840756', '218.83', 'USD']]),
    templateSheet('CHB', 0, []),
    templateSheet('REF', 0, []),
    templateSheet('RDR', 0, []),
    templateSheet('RR', 0, []),
    ...TEMPLATE_TAIL([]),
  ],
}

/** data/samples/batch-split part2: the I and R sheets plus the batch fees. */
export const BATCH_SPLIT_PART2: WorkbookDescription = {
  sheets: [
    templateSheet('APP', 0, []),
    templateSheet('DEC', 0, []),
    templateSheet('CHB', 3, [
      ['535044421404059', '46.67', 'USD'],
      ['', '', ''],
    ]),
    templateSheet('REF', 7, [['175616400979144', '71.01000000000001', 'USD']]),
    templateSheet('RDR', 3, [['175186502472327', '89.78', 'USD']]),
    templateSheet('RR', 320, [['605317920155402', '2.27', 'USD']]),
    ...TEMPLATE_TAIL(OTHER_FEES_CLEAN),
  ],
}

const LEGACY_HEADERS = ['Merchant Order No#', 'Order Status', 'Amount USD']

/** data/samples/legacy-provider: Summary / TRX / Fail / CB with status by column; a CHB 2 row in CB. */
export const LEGACY_WORKBOOK: WorkbookDescription = {
  sheets: [
    sheet('Summary', ['Batch', 'Total'], 1, [['Batch 7', '7431.52']], [stats(['Batch 7']), stats(null, 1)]),
    sheet(
      'TRX',
      LEGACY_HEADERS,
      60,
      [['de0d5456-d2d1-4de5-9ce9-baeae3370c11', 'Successful', '174.29']],
      [HIGH_CARDINALITY, stats(['Successful']), stats(null, 60)],
    ),
    sheet(
      'Fail',
      LEGACY_HEADERS,
      20,
      [['c0871a18-65df-4d1b-abef-fcdb1c44edf0', 'Failed', '134.85']],
      [stats(['c0871a18-65df-4d1b-abef-fcdb1c44edf0']), stats(['Failed']), stats(null, 20)],
    ),
    sheet(
      'CB',
      LEGACY_HEADERS,
      1,
      [['df14616d-4b26-4ffb-9984-72717ebff6a6', 'CHB 2', '305.32']],
      [stats(['df14616d-4b26-4ffb-9984-72717ebff6a6']), stats(['CHB 2']), stats(null, 1)],
    ),
  ],
}
