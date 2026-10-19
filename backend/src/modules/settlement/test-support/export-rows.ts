/** Export rows of a sample's movements, in the reader's stable order (cycle, then sheet and row), without a database. */
import type { Cycle, TransactionStatusCode } from '@recon/shared'
import { computeSettlement } from '../domain/compute-settlement.js'
import type { ExportRow } from '../domain/exports/transactions-csv.js'
import { settlementSampleInput } from './sample-input.js'

export async function sampleExportRows(name: 'batch-clean' | 'legacy-provider'): Promise<ExportRow[]> {
  const { movements } = computeSettlement(await settlementSampleInput(name))
  const rows = movements.map((m) => ({
    sourceTransactionId: m.sourceTransactionId,
    cycle: m.cycle,
    status: m.statusCode,
    excludeAmount: m.excludeAmount,
  }))
  return (['E', 'I', 'R'] as const).flatMap((cycle) => rows.filter((r) => r.cycle === cycle))
}

export const exportRow = (
  sourceTransactionId: string,
  cycle: Cycle,
  status: TransactionStatusCode,
  excludeAmount = false,
): ExportRow => ({ sourceTransactionId, cycle, status, excludeAmount })

/** The data lines of a CSV body, without the header. */
export const dataLines = (body: string) => body.split('\r\n').slice(1, -1)
