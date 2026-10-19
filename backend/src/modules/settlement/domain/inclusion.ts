// Which rows of the import become movements (settlement-process design D8, D9; spec settlement "Inclusión de las
// apariciones al procesar" and "Filas que no se procesan").
import type { RowInclusion, SettlementRow, Skipped } from './types.js'

/** Code-point order, not the locale of the machine (README §3.3 "Primera aparición"). */
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** First-appearance order: file upload order, sheet position, row, then file and sheet ids. */
export function compareRows(a: SettlementRow, b: SettlementRow): number {
  return (
    a.fileOrder - b.fileOrder ||
    a.sheetOrder - b.sheetOrder ||
    a.rowNo - b.rowNo ||
    compareText(a.fileId, b.fileId) ||
    compareText(a.sheetId, b.sheetId)
  )
}

/**
 * A matched row is processed unless one of its current_import occurrences of the current run excludes it: a row in
 * several findings is excluded when any of them excludes it (AND), so no movement counts twice by default. Every row
 * that is not processed is counted under exactly one reason, in the order of `Skipped`.
 */
export function classifyRows(
  rows: readonly SettlementRow[],
  inclusions: readonly RowInclusion[],
): { processed: SettlementRow[]; skipped: Skipped } {
  const excludedRows = new Set(inclusions.filter((i) => !i.includeInSettlement).map((i) => `${i.sheetId}:${i.rowNo}`))
  const skipped: Skipped = { ignored: 0, unmatched: 0, ambiguous: 0, excluded: 0, unresolvedStatus: 0, pending: 0 }
  const processed: SettlementRow[] = []
  for (const row of [...rows].sort(compareRows)) {
    const reason = skipReason(row, excludedRows)
    if (reason === null) processed.push(row)
    else skipped[reason]++
  }
  return { processed, skipped }
}

function skipReason(row: SettlementRow, excludedRows: ReadonlySet<string>): keyof Skipped | null {
  if (row.ignore || row.matchResult === 'ignored') return 'ignored'
  if (row.matchResult === 'unmatched') return 'unmatched'
  if (row.matchResult === 'ambiguous') return 'ambiguous'
  if (row.transaction === null) throw new Error(`matched row ${row.sheetId}:${row.rowNo} has no transaction`)
  if (excludedRows.has(`${row.sheetId}:${row.rowNo}`)) return 'excluded'
  // R has no status (the reserve is not one): only E and I rows need theirs, and a Pending row is never processed.
  if (row.cycle !== 'R' && row.statusCode === null) return 'unresolvedStatus'
  if (row.cycle !== 'R' && row.statusCode === 'Pending') return 'pending'
  return null
}
