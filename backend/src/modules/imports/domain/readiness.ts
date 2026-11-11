// Readiness of the mapping as it stands (README §4.2 "readiness", HU1 CA5; design D7): what blocks the
// analysis (`missing`) and what is worth reviewing (`notes`). Pure over the proposal and the sheet facts.
import type { Readiness, ReadinessField, ReadinessItem } from '@recon/shared'
import type { ColumnProposalResult, SheetProposalResult } from '../../matching/domain/propose-mapping.js'
import type { StatusCatalogEntry } from '../../matching/domain/rules.js'
import { unconfirmedSheetMessage } from './analysis-preconditions.js'
import type { ColumnStats } from './workbook.js'

export interface ReadinessSheet {
  /** null before the sheet has been persisted. */
  sheetId: string | null
  sheetName: string
  hidden: boolean
  rowCount: number
  /** Whether the analyst confirmed the mapping of the sheet; only a mapped import asks for it (design D4). */
  mappingConfirmed: boolean
  proposed: SheetProposalResult
  columns: ColumnProposalResult[]
  /** Parallel to `columns`. */
  columnStats: ColumnStats[]
}

const DECLINED = 'Declined'

export interface ReadinessOptions {
  /** True in a mapped import: a sheet not confirmed blocks the analysis, as its 422 says (spec "Hojas sin confirmar en la readiness"). */
  requireConfirmation?: boolean
}

export function assessReadiness(
  sheets: ReadinessSheet[],
  statuses: StatusCatalogEntry[],
  { requireConfirmation = false }: ReadinessOptions = {},
): Readiness {
  const missing: ReadinessItem[] = []
  const notes: ReadinessItem[] = []
  const cycleOf = (statusId: number | null) => statuses.find((s) => s.statusId === statusId)?.cycle ?? null

  if (sheets.length === 0) {
    missing.push({ sheetId: null, sheetName: null, field: 'transactions', message: 'The import has no files' })
  } else if (!sheets.some((s) => s.proposed.kind === 'transactions')) {
    missing.push({
      sheetId: null,
      sheetName: null,
      field: 'transactions',
      message: 'No sheet is proposed as transactions',
    })
  }

  for (const sheet of sheets) {
    const own = assessSheet(sheet, cycleOf)
    notes.push(...own.notes)
    if (requireConfirmation && !sheet.mappingConfirmed) {
      // Its other gaps belong to a proposal nobody confirmed yet; the analysis names it for confirmation only.
      missing.push({
        sheetId: sheet.sheetId,
        sheetName: sheet.sheetName,
        field: 'confirmation',
        message: unconfirmedSheetMessage(sheet.sheetName),
      })
    } else {
      missing.push(...own.missing)
    }
  }

  return { canAnalyze: missing.length === 0, missing, notes }
}

/** What one sheet lacks and what is worth reviewing in it, over the mapping that governs. */
function assessSheet(
  sheet: ReadinessSheet,
  cycleOf: (statusId: number | null) => string | null,
): { missing: ReadinessItem[]; notes: ReadinessItem[] } {
  const missing: ReadinessItem[] = []
  const notes: ReadinessItem[] = []
  const item = (message: string): ReadinessItem => ({ sheetId: sheet.sheetId, sheetName: sheet.sheetName, message })
  const lacking = (field: ReadinessField, message: string): ReadinessItem => ({ ...item(message), field })
  const { proposed, columns } = sheet
  const target = (field: ColumnProposalResult['targetField']) => columns.findIndex((c) => c.targetField === field)

  if (proposed.kind === null) {
    missing.push(
      lacking('kind', `No rule matches sheet "${sheet.sheetName}": classify it as transactions, batch_fees or ignore`),
    )
    return { missing, notes }
  }
  if (sheet.hidden) notes.push(item('The sheet is hidden in the workbook'))
  if (proposed.kind === 'ignore') {
    notes.push(item(proposed.note ?? `Sheet "${sheet.sheetName}" is ignored`))
    return { missing, notes }
  }
  if (proposed.kind === 'batch_fees') {
    if (target('feeType') === -1) notes.push(item('No column is proposed as feeType; no batch fees will be prefilled'))
    else if (target('amount') === -1)
      notes.push(item('No column is proposed as amount; no batch fees will be prefilled'))
    return { missing, notes }
  }

  // kind = transactions
  const idIndex = target('transactionId')
  const statusIndex = target('status')
  if (idIndex === -1) missing.push(lacking('transactionId', 'No column is proposed as transactionId'))
  if (proposed.cycle === null) missing.push(lacking('cycle', 'The sheet rule has no cycle'))
  else if (proposed.cycle !== 'R' && proposed.statusId === null && statusIndex === -1) {
    missing.push(lacking('status', 'No status: neither a fixed status by sheet rule nor a column proposed as status'))
  }
  if (sheet.rowCount === 0) notes.push(item('The sheet has no rows'))
  if (proposed.statusName === DECLINED && sheet.rowCount > 0) {
    notes.push(item(`Fixed status ${DECLINED} with rows: the DEC range will open at validation`))
  }

  const lossy = idIndex === -1 ? 0 : (sheet.columnStats[idIndex]?.lossyNumericCells ?? 0)
  if (lossy > 0) {
    notes.push(
      item(
        `${lossy} numeric ID cell(s) with scientific notation or more than 15 digits; those rows will be rejected at analysis`,
      ),
    )
  }

  if (statusIndex !== -1) {
    const values = columns[statusIndex]?.statusValues
    if (values === undefined) {
      notes.push(item('More than the tracked distinct status values; they will be resolved row by row at analysis'))
    } else {
      const unknown = values.filter((v) => v.statusId === null).map((v) => `"${v.value}"`)
      if (unknown.length > 0)
        notes.push(item(`Status value(s) ${unknown.join(', ')} have no alias and will stay unresolved`))
      if (proposed.cycle === 'E' || proposed.cycle === 'I') {
        for (const value of values) {
          const natural = cycleOf(value.statusId)
          if (natural !== null && natural !== proposed.cycle) {
            notes.push(
              item(`Status "${value.value}" (cycle ${natural}) does not match the sheet cycle ${proposed.cycle}`),
            )
          }
        }
      }
    }
  }

  return { missing, notes }
}
