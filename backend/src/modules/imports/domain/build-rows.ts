// From a row read as text and the confirmed mapping of its sheet to what ImportRow stores (README §3.2 ImportRow;
// spec "Fila original de referencia", "Estado e importe por fila"; design D5). Pure: the cross-match comes separately.
import type { Cycle, RowReason, SheetMappingColumn, TargetField, WarningCode } from '@recon/shared'
import type { MatchingRules } from '../../matching/domain/rules.js'
import { resolveStatusAlias } from '../../matching/domain/status-alias.js'
import type { NewImportRow } from '../application/ports.js'
import type { MatchOutcome } from './match-rows.js'
import { parseMoney } from './money.js'
import type { SheetRow } from './workbook.js'

/** The confirmed mapping of a transactions sheet, as the row builder needs it. */
export interface RowContext {
  sheetId: string
  headers: string[]
  kind: 'transactions'
  cycle: Cycle
  /** Fixed status of the sheet; null when the status comes from a column (or never, on an R sheet). */
  statusId: number | null
  columns: SheetMappingColumn[]
  rules: Pick<MatchingRules, 'aliases' | 'statuses'>
}

/** Everything of the row but the cross-match. */
export interface RowDraft {
  sheetId: string
  rowNo: number
  /** The id cell as read, untruncated. */
  idText: string
  idLossy: boolean
  /** What the column holds: the id cell cut to its 100 characters. */
  transactionIdRaw: string
  statusRaw: string | null
  statusId: number | null
  excludeAmount: boolean
  cycle: Cycle
  amount: string | null
  currency: string | null
  rawData: Record<string, string>
  warnings: WarningCode[]
}

/** The cross-match (or why there was none) that completes a draft. */
export type RowResolution =
  | MatchOutcome
  | { matchResult: 'ignored'; reason: 'empty_id' }
  | { matchResult: 'unmatched'; reason: Extract<RowReason, 'lossy_numeric_id' | 'no_gateways' | 'id_format'> }

const ID_RAW_MAX = 100
const STATUS_RAW_MAX = 50
const USD = 'USD'
const CURRENCY = /^[A-Za-z]{3}$/

function columnIndex(ctx: RowContext, targetField: TargetField): number {
  const column = ctx.columns.find((c) => c.targetField === targetField)
  return column === undefined ? -1 : ctx.headers.indexOf(column.sourceColumn)
}

function cellAt(row: SheetRow, index: number): string {
  return index < 0 ? '' : (row.cells[index] ?? '')
}

export function buildRowDraft(row: SheetRow, ctx: RowContext): RowDraft {
  const warnings: WarningCode[] = []
  const idIndex = columnIndex(ctx, 'transactionId')
  const idText = cellAt(row, idIndex)

  // Status: the fixed status of the sheet governs; a status column is resolved through the aliases and only
  // governs when the sheet has no fixed status (decision 2 of the proposal review).
  const statusIndex = columnIndex(ctx, 'status')
  const statusText = cellAt(row, statusIndex)
  const statusRaw = statusIndex < 0 ? null : statusText.slice(0, STATUS_RAW_MAX)
  let statusId = ctx.statusId
  let excludeAmount = false
  if (statusIndex >= 0) {
    const resolved = resolveStatusAlias(statusText, ctx.rules)
    if (ctx.statusId !== null) {
      if (resolved.statusId !== null && resolved.statusId !== ctx.statusId) warnings.push('status_differs_from_sheet')
    } else {
      statusId = resolved.statusId
      excludeAmount = resolved.excludeAmount
      if (resolved.statusId === null) warnings.push('status_unresolved')
    }
  }
  if ((ctx.cycle === 'E' || ctx.cycle === 'I') && statusId !== null) {
    const natural = ctx.rules.statuses.find((s) => s.statusId === statusId)?.cycle
    if (natural !== undefined && natural !== ctx.cycle) warnings.push('cycle_mismatch')
  }

  // Amount: read as decimal text, four places; a negative amount is a warning, not a block (README §1.2).
  const amountText = cellAt(row, columnIndex(ctx, 'amount')).trim()
  let amount: string | null = null
  if (amountText !== '') {
    amount = parseMoney(amountText)
    if (amount === null) warnings.push('amount_unparsed')
    else if (amount.startsWith('-')) warnings.push('negative_amount')
  }

  // Currency: kept as a reference, never compared (README §1.2 "USD").
  const currencyText = cellAt(row, columnIndex(ctx, 'currency')).trim()
  let currency: string | null = null
  if (currencyText !== '') {
    if (CURRENCY.test(currencyText)) {
      currency = currencyText.toUpperCase()
      if (currency !== USD) warnings.push('non_usd_currency')
    } else {
      warnings.push('currency_invalid')
    }
  }

  return {
    sheetId: ctx.sheetId,
    rowNo: row.rowNo,
    idText,
    idLossy: idIndex >= 0 && row.lossyNumeric.includes(idIndex),
    transactionIdRaw: idText.slice(0, ID_RAW_MAX),
    statusRaw,
    statusId,
    excludeAmount,
    cycle: ctx.cycle,
    amount,
    currency,
    rawData: Object.fromEntries(ctx.headers.map((header, i) => [header, row.cells[i] ?? ''])),
    warnings,
  }
}

/**
 * Completes a draft with its resolution. An R row takes the current status of the matched transaction
 * (README §3.2 ImportRow). `detailJson` carries only what there is to say, or null.
 */
export function toNewImportRow(draft: RowDraft, resolution: RowResolution, idLength = false): NewImportRow {
  const warnings = idLength ? [...draft.warnings, 'id_length' as const] : draft.warnings
  const matched = 'transaction' in resolution ? resolution.transaction : null
  const candidates = 'candidates' in resolution ? resolution.candidates : []
  const detail: Record<string, unknown> = {}
  if (resolution.reason !== null) detail.reason = resolution.reason
  if (warnings.length > 0) detail.warnings = warnings
  if (draft.excludeAmount) detail.excludeAmount = true
  if (candidates.length > 0) detail.candidates = candidates
  return {
    sheetId: draft.sheetId,
    rowNo: draft.rowNo,
    transactionIdRaw: draft.transactionIdRaw,
    transactionId: 'transactionId' in resolution ? resolution.transactionId : null,
    gatewayId: 'gatewayId' in resolution ? resolution.gatewayId : null,
    statusRaw: draft.statusRaw,
    statusId: draft.cycle === 'R' && matched !== null ? matched.statusId : draft.statusId,
    cycle: draft.cycle,
    amount: draft.amount,
    currency: draft.currency,
    txnDate: null,
    feeTypeRaw: null,
    rawData: JSON.stringify(draft.rawData),
    ignore: resolution.matchResult === 'ignored',
    matchResult: resolution.matchResult,
    detailJson: Object.keys(detail).length > 0 ? JSON.stringify(detail) : null,
  }
}
