// What must hold before any row is read (README HU1 CA5; spec: import, D7, D1): every sheet confirmed, a transactions sheet, an id column, a way to get the status. Design D6, D1 point 4.
import type { Cycle, ReadinessField, SheetKind, SheetMappingColumn } from '@recon/shared'
import type { StatusCatalogEntry } from '../../matching/domain/rules.js'
import { ImportTooLargeError, type MissingItem } from './errors.js'

export interface PreconditionSheet {
  sheetId: string
  sheetName: string
  mappingConfirmed: boolean
  kind: SheetKind | null
  cycle: Cycle | null
  statusId: number | null
  columns: SheetMappingColumn[]
  rowCount: number
}

export interface AnalysisLimits {
  maxRowsPerImport: number
}

function lacking(
  sheet: Pick<PreconditionSheet, 'sheetId' | 'sheetName'> | null,
  field: ReadinessField,
  message: string,
): MissingItem {
  return { sheetId: sheet?.sheetId ?? null, sheetName: sheet?.sheetName ?? null, field, message }
}

/** Missing items in sheet order; empty when the analysis can run. */
export function analysisPreconditions(sheets: PreconditionSheet[], statuses: StatusCatalogEntry[]): MissingItem[] {
  const missing: MissingItem[] = []
  if (!sheets.some((s) => s.kind === 'transactions')) {
    missing.push(lacking(null, 'transactions', 'No sheet is mapped as transactions'))
  }
  for (const sheet of sheets) {
    if (!sheet.mappingConfirmed) {
      missing.push(lacking(sheet, 'confirmation', `The mapping of sheet "${sheet.sheetName}" is not confirmed`))
      continue
    }
    if (sheet.kind !== 'transactions') continue
    const has = (field: SheetMappingColumn['targetField']) => sheet.columns.some((c) => c.targetField === field)
    if (!has('transactionId')) {
      missing.push(
        lacking(sheet, 'transactionId', `No column of sheet "${sheet.sheetName}" is mapped as transactionId`),
      )
    }
    if (sheet.cycle === null) {
      missing.push(lacking(sheet, 'cycle', `Sheet "${sheet.sheetName}" has no cycle`))
    } else if (sheet.cycle !== 'R') {
      if (sheet.statusId === null && !has('status')) {
        missing.push(
          lacking(
            sheet,
            'status',
            `Sheet "${sheet.sheetName}" has neither a fixed status nor a column mapped as status`,
          ),
        )
      } else if (sheet.statusId !== null && !statuses.some((s) => s.statusId === sheet.statusId)) {
        missing.push(lacking(sheet, 'status', `Sheet "${sheet.sheetName}" has an unknown status ${sheet.statusId}`))
      }
    }
  }
  return missing
}

/** The rows of the transactions sheets, summed, must fit the per-import cap (design D1 point 4). */
export function assertImportSize(sheets: Pick<PreconditionSheet, 'kind' | 'rowCount'>[], limits: AnalysisLimits): void {
  const rows = sheets.reduce((sum, s) => (s.kind === 'transactions' ? sum + s.rowCount : sum), 0)
  if (rows > limits.maxRowsPerImport) throw new ImportTooLargeError(rows, limits.maxRowsPerImport)
}
