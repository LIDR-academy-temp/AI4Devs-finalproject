// TXN for the Back-Office (design D6, gate P2): ID,Status with the E Successful and the I adjustments, without
// Declined, one row per distinct (ID, Status) in the reader's stable order. The ID goes as it is (gate P1).
import type { Cycle, TransactionStatusCode } from '@recon/shared'
import { toCsv } from './csv.js'

/** A movement as the exports read it, in the stable order (cycle, sheetId, rowNo, settlementTxnId). */
export interface ExportRow {
  sourceTransactionId: string
  cycle: Cycle
  status: TransactionStatusCode
  /** CHB 2: a Chargeback whose amount is excluded; it is still a CHB for the Back-Office. */
  excludeAmount: boolean
}

export interface ExportFile {
  body: string
  /** Data rows, without the header. */
  rows: number
}

/** Back-Office code of a movement by its cycle and status; a movement outside the map is not in the TXN. */
export const BACK_OFFICE_STATUS: Readonly<Record<Cycle, Partial<Record<TransactionStatusCode, string>>>> = {
  E: { Successful: 'SUC' },
  I: { Chargeback: 'CHB', Refund: 'REF', RDR: 'RDR' },
  R: {},
}

export function transactionsCsv(movements: readonly ExportRow[]): ExportFile {
  const seen = new Set<string>()
  const rows: string[][] = []
  for (const m of movements) {
    const code = BACK_OFFICE_STATUS[m.cycle][m.status]
    if (code === undefined) continue
    const key = `${m.sourceTransactionId}\u0000${code}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push([m.sourceTransactionId, code])
  }
  return { body: toCsv(['ID', 'Status'], rows), rows: rows.length }
}
