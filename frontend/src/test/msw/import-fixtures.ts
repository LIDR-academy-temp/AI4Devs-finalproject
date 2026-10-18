// The import world of the fake API (design D12): workbooks by label, the analysis facts of each sample taken from
// data/samples/*/expected.json and the spec `import`, and the rows the analysis produces, typed with the contract.
import { TRANSACTION_STATUSES } from '@recon/shared'
import type { ChannelNoticeItem, ImportDetail, ImportRowItem, ImportSheet } from '@/lib/api/types'
import { ACCOUNT_IDS } from './fixtures'
import { SAMPLE_WORKBOOKS } from './import-workbooks'

export type SheetTemplate = Pick<ImportSheet, 'sheetName' | 'hidden' | 'rowCount' | 'proposed' | 'columns' | 'preview'>

export interface Workbook {
  /** Name of the sample file in data/samples (the default name of the test File). */
  fileName: string
  sheets: SheetTemplate[]
}

export type AccountName = keyof typeof ACCOUNT_IDS

const BONUS_SHEET: SheetTemplate = {
  sheetName: 'Bonus',
  hidden: false,
  rowCount: 4,
  proposed: { kind: null, cycle: null, statusId: null, statusName: null, source: 'none' },
  columns: [
    { sourceColumn: 'Reference', targetField: null, source: 'none' },
    { sourceColumn: 'Importe', targetField: null, source: 'none' },
  ],
  preview: [
    { Reference: 'BN-0001', Importe: '10.00' },
    { Reference: 'BN-0002', Importe: '12.50' },
  ],
}

const appOf = (label: keyof typeof SAMPLE_WORKBOOKS) => SAMPLE_WORKBOOKS[label].sheets[0]!

/** A distinct valid workbook with one APP sheet of five rows (selections of many files). */
function genericWorkbook(n: string): Workbook {
  const app = appOf('batch-clean')
  return {
    fileName: `Recon_Template_ProviderA-USD_generic-${n}.xlsx`,
    sheets: [
      {
        ...app,
        rowCount: 5,
        preview: app.preview.map((row, i) => ({ ...row, ID: `9${n.padStart(4, '0')}${String(i).padStart(10, '0')}` })),
      },
    ],
  }
}

/**
 * The workbook a test File stands for: its content starts with a label (`batch-clean`, `batch-split_part1`,
 * `bonus`, `generic-3`…). `broken` and unknown content are unreadable, like a renamed .xls.
 */
export function workbookOf(label: string): Workbook | null {
  if (label in SAMPLE_WORKBOOKS) return SAMPLE_WORKBOOKS[label as keyof typeof SAMPLE_WORKBOOKS]
  if (label === 'bonus') return { fileName: 'Bonus_ProviderA-USD.xlsx', sheets: [appOf('batch-clean'), BONUS_SHEET] }
  const generic = /^generic-(\d+)$/.exec(label)
  if (generic) return genericWorkbook(generic[1]!)
  return null
}

export function defaultFileName(label: string): string {
  return workbookOf(label)?.fileName ?? `${label}.xlsx`
}

export type SampleKey = 'batch-clean' | 'batch-split' | 'batch-issues' | 'batch-blocked' | 'legacy-provider' | 'bonus'

export const SAMPLE_LABELS: Record<SampleKey, string[]> = {
  'batch-clean': ['batch-clean'],
  'batch-split': ['batch-split_part1', 'batch-split_part2'],
  'batch-issues': ['batch-issues'],
  'batch-blocked': ['batch-blocked'],
  'legacy-provider': ['legacy-provider'],
  bonus: ['bonus'],
}

export const SAMPLE_ACCOUNTS: Record<SampleKey, AccountName> = {
  'batch-clean': 'ProviderA-USD',
  'batch-split': 'ProviderA-USD',
  'batch-issues': 'ProviderB-Main',
  'batch-blocked': 'ProviderB-Main',
  'legacy-provider': 'ProviderC-Alt',
  bonus: 'ProviderA-USD',
}

/** What the real analysis gives for a set of files beyond the rows themselves. */
export interface AnalysisFacts {
  /** Matched rows are assigned to these channels in order (counts sum to the matched rows). */
  channels: ChannelNoticeItem[]
  batchFees: NonNullable<ImportDetail['batchFees']>
  /** Row overrides by `<sheetName>:<rowNo>`. */
  rows: Record<string, RowOverride>
}

type RowOverride = 'empty_id' | Partial<ImportRowItem>

const UNASSIGNED_NOTE = 'Not assigned yet: it will be associated to this account as primary when the batch is processed'
const OTHER_ACCOUNT_NOTE = 'This account will become the primary account of the channel when the batch is processed'

const notice = (
  channelId: number,
  name: string,
  providerId: number,
  rowCount: number,
  assignment: ChannelNoticeItem['assignment'] = 'assigned',
  otherAccount: ChannelNoticeItem['otherAccount'] = null,
): ChannelNoticeItem => ({
  channelId,
  name,
  gatewayId: providerId === 201 ? 2 : 1,
  providerId,
  rowCount,
  assignment,
  otherAccount,
  note: assignment === 'unassigned' ? UNASSIGNED_NOTE : assignment === 'assigned' ? null : OTHER_ACCOUNT_NOTE,
})

const fee = (feeTypeId: number | null, title: string, amount: string, warning?: string) => ({
  feeTypeId,
  code: feeTypeId === null ? null : title,
  title,
  amount,
  currency: 'USD',
  source: 'file' as const,
  ...(warning ? { warning } : {}),
})

const CLEAN: AnalysisFacts = {
  channels: [
    notice(1001, 'RAM-01', 101, 375),
    notice(1002, 'RAM-02', 101, 375),
    notice(1007, 'RAM-07', 101, 30, 'unassigned'),
  ],
  batchFees: [fee(121, 'Wire Fee', '25.0000'), fee(117, 'Settlement Fee', '15.0000')],
  rows: { 'CHB:4': 'empty_id', 'REF:8': 'empty_id', 'RDR:4': 'empty_id' },
}

/** Analysis facts by the labels of the import's files, sorted and joined with `+`. */
export const ANALYSIS_FACTS: Record<string, AnalysisFacts> = {
  'batch-clean': CLEAN,
  'batch-split_part1+batch-split_part2': CLEAN,
  'batch-issues': {
    channels: [
      notice(1011, 'RAM-11', 102, 370),
      notice(1012, 'RAM-12', 102, 367),
      notice(1013, 'RAM-13', 102, 29, 'unassigned'),
    ],
    batchFees: [
      fee(121, 'Wire Fee', '25.0000'),
      fee(null, 'Fraud Monitoring Fee', '99.0000', 'Fee type not in the catalog; kept as a free amount'),
    ],
    rows: {
      'APP:340': {
        matchResult: 'unmatched',
        reason: 'no_match',
        transactionIdRaw: '4260465812403708',
        amount: '120.0000',
        rawData: { ID: '4260465812403708', Amount: '120', Currency: 'USD' },
      },
      'REF:2': { warnings: ['negative_amount'] },
      'CHB:9': 'empty_id',
      'REF:5': 'empty_id',
      'RDR:2': 'empty_id',
    },
  },
  'batch-blocked': {
    channels: [
      notice(1001, 'RAM-01', 101, 1, 'assigned_to_other_account', {
        accountId: ACCOUNT_IDS['ProviderA-USD'],
        name: 'ProviderA-USD',
      }),
      notice(1011, 'RAM-11', 102, 16),
      notice(1012, 'RAM-12', 102, 4),
    ],
    batchFees: [],
    rows: {},
  },
  'legacy-provider': { channels: [notice(2002, 'RAM-U2', 201, 81)], batchFees: [], rows: {} },
}

const statusById = (statusId: number | null) => TRANSACTION_STATUSES.find((s) => s.statusId === statusId) ?? null

/** Decimal text of a cell with four decimals, or null when it is not a plain decimal. */
function toMoney(text: string): string | null {
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null
  const negative = text.startsWith('-')
  const [int, frac = ''] = text.replace('-', '').split('.')
  const scaled = BigInt(int + frac.padEnd(4, '0').slice(0, 4)) + (Number(frac[4] ?? '0') >= 5 ? 1n : 0n)
  const digits = scaled.toString().padStart(5, '0')
  return `${negative ? '-' : ''}${digits.slice(0, -4)}.${digits.slice(-4)}`
}

export interface RowSheet {
  fileId: string
  fileName: string
  sheetId: string
  template: SheetTemplate
  kind: 'transactions'
  cycle: 'E' | 'I' | 'R'
  statusId: number | null
  columns: { sourceColumn: string; targetField: string }[]
}

/** A row as the API returns it; only what a test sets differs from a plain matched APP row. */
export function makeRow(overrides: Partial<ImportRowItem> = {}): ImportRowItem {
  return {
    fileId: '00000000-0000-4000-8000-0000000f0001',
    fileName: 'Recon_Template_ProviderA-USD_batch-clean.xlsx',
    sheetId: '00000000-0000-4000-8000-0000000e0001',
    sheetName: 'APP',
    rowNo: 2,
    cycle: 'E',
    matchResult: 'matched',
    reason: null,
    transactionIdRaw: '252570479111759',
    transactionId: '9496',
    gatewayId: 1,
    statusRaw: null,
    statusId: 2,
    statusName: 'Successful',
    amount: '16.2200',
    currency: 'USD',
    excludeAmount: false,
    ignore: false,
    warnings: [],
    candidates: [],
    transaction: {
      transactionId: '9496',
      channelId: 1001,
      channelName: 'RAM-01',
      statusId: 2,
      statusName: 'Successful',
      amount: '16.2200',
      transactionDate: '2026-09-28T12:22:09.000Z',
    },
    rawData: { ID: '252570479111759', Amount: '16.22', Currency: 'USD' },
    ...overrides,
  }
}

/**
 * The rows of an analysis: one per data row of each transactions sheet, matched unless the facts say otherwise;
 * matched rows take their channel from `facts.channels` in order (or from `fallbackChannel`).
 */
export function buildRows(
  sheets: RowSheet[],
  facts: AnalysisFacts | undefined,
  fallbackChannel: { channelId: number; name: string; gatewayId: number },
): ImportRowItem[] {
  const plan = (facts?.channels ?? []).flatMap((c) =>
    Array.from({ length: c.rowCount }, () => ({ channelId: c.channelId, name: c.name ?? '', gatewayId: c.gatewayId })),
  )
  const rows: ImportRowItem[] = []
  let matched = 0
  for (const sheet of sheets) {
    const column = (field: string) => sheet.columns.find((c) => c.targetField === field)?.sourceColumn
    const idColumn = column('transactionId')
    const amountColumn = column('amount')
    const currencyColumn = column('currency')
    const statusColumn = column('status')
    const statusValues = sheet.template.columns.find((c) => c.sourceColumn === statusColumn)?.statusValues ?? []
    const uuidIds = /^[0-9a-f-]{36}$/.test(String(sheet.template.preview[0]?.[idColumn ?? ''] ?? ''))
    const headers = sheet.template.columns.map((c) => c.sourceColumn)

    for (let rowNo = 2; rowNo < sheet.template.rowCount + 2; rowNo++) {
      const seq = rows.length + 1
      const synthetic = uuidIds
        ? `0000${String(seq).padStart(4, '0')}-0000-4000-8000-${String(seq).padStart(12, '0')}`
        : String(700000000000000 + seq)
      const rawData: Record<string, string> = sheet.template.preview[rowNo - 2] ?? {
        ...Object.fromEntries(headers.map((h) => [h, ''])),
        ...(idColumn ? { [idColumn]: synthetic } : {}),
        ...(amountColumn ? { [amountColumn]: `${10 + (seq % 90)}.25` } : {}),
        ...(currencyColumn ? { [currencyColumn]: 'USD' } : {}),
        ...(statusColumn ? { [statusColumn]: statusValues[0]?.value ?? '' } : {}),
      }
      const statusRaw = statusColumn ? (rawData[statusColumn] ?? null) : null
      const resolved = statusValues.find((v) => v.value === statusRaw)
      const status = sheet.cycle === 'R' ? statusById(2) : statusById(sheet.statusId ?? resolved?.statusId ?? null)
      const amount = amountColumn ? toMoney(rawData[amountColumn] ?? '') : null
      const currencyText = currencyColumn ? (rawData[currencyColumn] ?? '') : ''
      let row = makeRow({
        fileId: sheet.fileId,
        fileName: sheet.fileName,
        sheetId: sheet.sheetId,
        sheetName: sheet.template.sheetName,
        rowNo,
        cycle: sheet.cycle,
        transactionIdRaw: idColumn ? (rawData[idColumn] ?? '') : null,
        statusRaw,
        statusId: status?.statusId ?? null,
        statusName: status?.name ?? null,
        amount,
        currency: /^[A-Za-z]{3}$/.test(currencyText) ? currencyText.toUpperCase() : null,
        excludeAmount: resolved?.excludeAmount ?? false,
        rawData,
      })

      const override = facts?.rows[`${sheet.template.sheetName}:${rowNo}`]
      if (override === 'empty_id') {
        row = {
          ...row,
          matchResult: 'ignored',
          reason: 'empty_id',
          ignore: true,
          transactionIdRaw: '',
          amount: null,
          currency: null,
          rawData: Object.fromEntries(headers.map((h) => [h, ''])),
        }
      } else if (override) {
        row = { ...row, ...override }
      }
      if (row.amount?.startsWith('-') && !row.warnings.includes('negative_amount')) {
        row = { ...row, warnings: [...row.warnings, 'negative_amount'] }
      }

      if (row.matchResult === 'matched') {
        const channel = plan[matched] ?? fallbackChannel
        matched += 1
        const transactionId = String(9000 + seq)
        row = {
          ...row,
          transactionId,
          gatewayId: channel.gatewayId,
          transaction: {
            transactionId,
            channelId: channel.channelId,
            channelName: channel.name,
            statusId: row.statusId ?? 2,
            statusName: row.statusName ?? 'Successful',
            amount: row.amount ?? '0.0000',
            transactionDate: '2026-09-28T12:00:00.000Z',
          },
        }
      } else {
        row = { ...row, transactionId: null, gatewayId: null, transaction: null }
      }
      rows.push(row)
    }
  }
  return rows
}

const RESULT_ORDER = ['unmatched', 'ambiguous', 'matched', 'ignored'] as const

/** The order of GET rows: unmatched, ambiguous, matched, ignored; then file, sheet name and row number. */
export function sortRows(rows: ImportRowItem[], fileOrder: string[]): ImportRowItem[] {
  return [...rows].sort(
    (a, b) =>
      RESULT_ORDER.indexOf(a.matchResult) - RESULT_ORDER.indexOf(b.matchResult) ||
      fileOrder.indexOf(a.fileId) - fileOrder.indexOf(b.fileId) ||
      a.sheetName.localeCompare(b.sheetName, 'en', { sensitivity: 'base' }) ||
      a.rowNo - b.rowNo,
  )
}

/** `analysis` as the API derives it from the persisted rows. */
export function summarize(rows: ImportRowItem[]): NonNullable<ImportDetail['analysis']> {
  const count = (result: ImportRowItem['matchResult']) => rows.filter((r) => r.matchResult === result).length
  const counted = rows.filter((r) => r.matchResult !== 'ignored')
  const warnings = Object.fromEntries(
    [
      'negative_amount',
      'non_usd_currency',
      'amount_unparsed',
      'currency_invalid',
      'id_length',
      'lossy_numeric_id',
      'status_unresolved',
      'status_differs_from_sheet',
      'cycle_mismatch',
    ].map((code) => [code, rows.filter((r) => r.warnings.includes(code as ImportRowItem['warnings'][number])).length]),
  )
  return {
    rows: {
      total: rows.length,
      matched: count('matched'),
      unmatched: count('unmatched'),
      ambiguous: count('ambiguous'),
      ignored: count('ignored'),
    },
    byCycle: {
      E: counted.filter((r) => r.cycle === 'E').length,
      I: counted.filter((r) => r.cycle === 'I').length,
      R: counted.filter((r) => r.cycle === 'R').length,
    },
    warnings,
  }
}
