// Usage of fees (admin-fees design D5): a movement breakdown or a batch fee of any attempt, undone included, makes a
// fee in use; its last applied event is the latest business day among the event dates of its breakdowns and the
// settlement dates of the batches that charged it as a batch fee. Rows without a date count as use but not as a day.
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import type { FeeUsage } from '../domain/fee-patch.js'
import { businessDay } from '../domain/fee-selection.js'

export type { FeeUsage }

type Db = PrismaClient | Prisma.TransactionClient

const NOT_IN_USE: FeeUsage = { inUse: false, lastAppliedEventDate: null }

const later = (a: string | null, b: string | null) => (a === null ? b : b === null ? a : a > b ? a : b)

/** Usage of each fee id; ids without any use map to { inUse: false, lastAppliedEventDate: null }. */
export async function usageOf(db: Db, feeIds: readonly string[]): Promise<Map<string, FeeUsage>> {
  const usage = new Map<string, FeeUsage>(feeIds.map((id) => [id.toLowerCase(), NOT_IN_USE]))
  if (feeIds.length === 0) return usage

  const [applied, batchFees] = await Promise.all([
    db.settlementTransactionFee.groupBy({
      by: ['feeId'],
      where: { feeId: { in: [...feeIds] } },
      _max: { eventDate: true },
    }),
    db.settlementBatchFee.findMany({
      where: { feeId: { in: [...feeIds] } },
      select: { feeId: true, batch: { select: { settlementDate: true } } },
    }),
  ])

  const mark = (feeId: string, day: string | null) => {
    const key = feeId.toLowerCase()
    const current = usage.get(key) ?? NOT_IN_USE
    usage.set(key, { inUse: true, lastAppliedEventDate: later(current.lastAppliedEventDate, day) })
  }
  for (const row of applied) mark(row.feeId, row._max.eventDate === null ? null : businessDay(row._max.eventDate))
  for (const row of batchFees)
    if (row.feeId !== null)
      mark(row.feeId, row.batch.settlementDate === null ? null : businessDay(row.batch.settlementDate))
  return usage
}

/** The usage of one fee id out of usageOf's map. */
export function usageFor(usage: Map<string, FeeUsage>, feeId: string): FeeUsage {
  return usage.get(feeId.toLowerCase()) ?? NOT_IN_USE
}
