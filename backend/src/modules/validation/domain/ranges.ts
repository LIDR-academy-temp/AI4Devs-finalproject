import { partitionRows } from './partition.js'
import { createStatusCatalog } from './status-catalog.js'
import type { CycleRanges, DateRange, MissingRange, StatusEntry, ValidationRow } from './types.js'

export interface RangesOutput {
  ranges: CycleRanges
  /** I rows that add no date: the gateway holds another status or has no change date (informative). */
  undatedAdjustmentCount: number
}

/**
 * Date ranges per cycle from the own rows of the import (questions 1 and 11), first step of #9 before loading the
 * candidates. APP: E rows whose gateway status is neither Declined nor Pending; DEC: E rows whose gateway status is
 * Declined (creation date); I: I rows whose gateway holds the row status (date of the change); R: R rows (creation
 * date of the transaction). Foreign and unmatched rows do not count.
 */
export function computeRanges(
  rows: readonly ValidationRow[],
  providerId: number,
  statuses: readonly StatusEntry[],
): RangesOutput {
  const catalog = createStatusCatalog(statuses)
  const pending = catalog.idOf('Pending')
  const declined = catalog.idOf('Declined')
  const ranges: CycleRanges = { APP: null, DEC: null, I: null, R: null }
  const widen = (range: MissingRange, date: Date) => {
    ranges[range] = widened(ranges[range], date)
  }
  let undatedAdjustmentCount = 0
  const { own } = partitionRows(rows, providerId)
  for (const r of own) {
    const t = r.transaction
    if (r.cycle === 'E') {
      if (t.statusId === declined) widen('DEC', t.transactionDate)
      else if (t.statusId !== pending) widen('APP', t.transactionDate)
    } else if (r.cycle === 'I') {
      if (t.statusId === r.statusId && t.lastStatusChangedAt !== null) widen('I', t.lastStatusChangedAt)
      else undatedAdjustmentCount++
    } else {
      widen('R', t.transactionDate)
    }
  }
  return { ranges, undatedAdjustmentCount }
}

function widened(range: DateRange | null, date: Date): DateRange {
  if (range === null) return { min: date, max: date }
  return { min: date < range.min ? date : range.min, max: date > range.max ? date : range.max }
}
