// RR for the Back-Office (design D6, gate P3): ID,Description with the R movements, "Batch <batchNo>", one row per
// distinct ID in the reader's stable order, whatever the reserve each one released. The ID goes as it is (gate P1).
import { toCsv } from './csv.js'
import type { ExportFile, ExportRow } from './transactions-csv.js'

export function reservesCsv(movements: readonly ExportRow[], batchNo: number): ExportFile {
  const description = `Batch ${batchNo}`
  const seen = new Set<string>()
  const rows: string[][] = []
  for (const m of movements) {
    if (m.cycle !== 'R' || seen.has(m.sourceTransactionId)) continue
    seen.add(m.sourceTransactionId)
    rows.push([m.sourceTransactionId, description])
  }
  return { body: toCsv(['ID', 'Description'], rows), rows: rows.length }
}
