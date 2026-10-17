// Readiness of the mapping as it stands (README §4.2 "readiness", HU1 CA5; design D7): what blocks the
// analysis (`missing`) and what is worth reviewing (`notes`). Pure over the proposal and the sheet facts.
import type { Readiness, ReadinessItem } from '@recon/shared'
import type { ColumnProposalResult, SheetProposalResult } from '../../matching/domain/propose-mapping.js'
import type { StatusCatalogEntry } from '../../matching/domain/rules.js'
import type { ColumnStats } from './workbook.js'

export interface ReadinessSheet {
  /** null before the sheet has been persisted. */
  sheetId: string | null
  sheetName: string
  hidden: boolean
  rowCount: number
  proposed: SheetProposalResult
  columns: ColumnProposalResult[]
  /** Parallel to `columns`. */
  columnStats: ColumnStats[]
}

const DECLINED = 'Declined'

export function assessReadiness(sheets: ReadinessSheet[], statuses: StatusCatalogEntry[]): Readiness {
  const missing: ReadinessItem[] = []
  const notes: ReadinessItem[] = []
  const cycleOf = (statusId: number | null) => statuses.find((s) => s.statusId === statusId)?.cycle ?? null

  if (sheets.length === 0) {
    missing.push({ sheetId: null, sheetName: null, message: 'The import has no files' })
  } else if (!sheets.some((s) => s.proposed.kind === 'transactions')) {
    missing.push({ sheetId: null, sheetName: null, message: 'No sheet is proposed as transactions' })
  }

  for (const sheet of sheets) {
    const item = (message: string): ReadinessItem => ({ sheetId: sheet.sheetId, sheetName: sheet.sheetName, message })
    const { proposed, columns } = sheet
    const target = (field: ColumnProposalResult['targetField']) => columns.findIndex((c) => c.targetField === field)

    if (proposed.kind === null) {
      missing.push(
        item(`No rule matches sheet "${sheet.sheetName}": classify it as transactions, batch_fees or ignore`),
      )
      continue
    }
    if (sheet.hidden) notes.push(item('The sheet is hidden in the workbook'))
    if (proposed.kind === 'ignore') {
      notes.push(item(proposed.note ?? `Sheet "${sheet.sheetName}" is ignored`))
      continue
    }
    if (proposed.kind === 'batch_fees') {
      if (target('feeType') === -1)
        notes.push(item('No column is proposed as feeType; no batch fees will be prefilled'))
      else if (target('amount') === -1)
        notes.push(item('No column is proposed as amount; no batch fees will be prefilled'))
      continue
    }

    // kind = transactions
    const idIndex = target('transactionId')
    const statusIndex = target('status')
    if (idIndex === -1) missing.push(item('No column is proposed as transactionId'))
    if (proposed.cycle === null) missing.push(item('The sheet rule has no cycle'))
    else if (proposed.cycle !== 'R' && proposed.statusId === null && statusIndex === -1) {
      missing.push(item('No status: neither a fixed status by sheet rule nor a column proposed as status'))
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
  }

  return { canAnalyze: missing.length === 0, missing, notes }
}
