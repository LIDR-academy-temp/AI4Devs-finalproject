import type { Cycle } from '@recon/shared'
import type { StatusCatalog } from './status-catalog.js'
import type { HistoryMovement, ValidationRow } from './types.js'

/** Duplicate / collision key (README §3.3): the same movement is the same transaction in the same cycle. */
export const conflictKey = (transactionId: bigint, cycle: Cycle): string => `${transactionId}:${cycle}`

/** "First occurrence" (question 13): file uploaded first, earlier sheet in the workbook, lower rowNo. */
export function compareCurrent(
  a: Pick<ValidationRow, 'fileOrder' | 'sheetOrder' | 'rowNo'>,
  b: Pick<ValidationRow, 'fileOrder' | 'sheetOrder' | 'rowNo'>,
): number {
  return a.fileOrder - b.fileOrder || a.sheetOrder - b.sheetOrder || a.rowNo - b.rowNo
}

/** Historical occurrences by batchNo, attemptNo, rowNo; batchId breaks the remaining ties. */
export function compareHistory(a: HistoryMovement, b: HistoryMovement): number {
  return (
    a.batchNo - b.batchNo ||
    a.attemptNo - b.attemptNo ||
    (a.rowNo ?? -1) - (b.rowNo ?? -1) ||
    (a.batchId < b.batchId ? -1 : a.batchId > b.batchId ? 1 : 0)
  )
}

export interface ComparableStatus {
  statusId: number
  excludeAmount: boolean
}

export type Relation = 'same' | 'different' | 'compatible'

/**
 * Two occurrences compare by (status, excludeAmount) (question 7). Only Chargeback against Chargeback with
 * excludeAmount (CHB 2) is `compatible` and produces nothing; any other difference is a collision.
 */
export function relation(a: ComparableStatus, b: ComparableStatus, catalog: StatusCatalog): Relation {
  if (a.statusId === b.statusId && a.excludeAmount === b.excludeAmount) return 'same'
  const chargeback = catalog.idOf('Chargeback')
  if (a.statusId === chargeback && b.statusId === chargeback) return 'compatible'
  return 'different'
}
