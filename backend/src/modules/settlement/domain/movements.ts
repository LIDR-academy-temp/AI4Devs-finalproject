// One movement per processed row (settlement-process design D4, D12; spec settlement "Importe, estado y fecha de cada
// movimiento", "Reserva retenida y liberada", "Ronda del movimiento I").
import type { ChargebackReservePolicy } from '@recon/shared'
import { percentOf, plusDays, text4, ZERO } from './money.js'
import type {
  MovementPlan,
  SettlementChannel,
  SettlementRow,
  SettlementTransactionData,
  SettlementWarning,
} from './types.js'

export interface MovementContext {
  channels: ReadonlyMap<number, SettlementChannel>
  /** Transactions with an E movement in a non-undone attempt of the provider (round 2). */
  previousE: ReadonlySet<bigint>
  policy: ChargebackReservePolicy
}

/** Rows already processed and in first-appearance order (classifyRows). */
export function buildMovements(
  rows: readonly SettlementRow[],
  ctx: MovementContext,
): { movements: MovementPlan[]; warnings: SettlementWarning[] } {
  const eInBatch = new Set(rows.filter((r) => r.cycle === 'E').map((r) => transactionOf(r).transactionId))
  const warnings: SettlementWarning[] = []
  const movements = rows.map((row) => {
    const t = transactionOf(row)
    const days = reserveDays(ctx, t.channelId)
    const base = {
      sheetId: row.sheetId,
      rowNo: row.rowNo,
      transactionId: t.transactionId,
      sourceTransactionId: t.sourceTransactionId,
      channelId: t.channelId,
      cardBrand: t.cardBrand,
      excludeAmount: row.excludeAmount,
      gatewayAmount: text4(t.amount),
      appliedReservePct: t.appliedReservePct,
      reserveDaysUsed: days,
      reserveHeldAmt: ZERO,
      reserveReleasedAmt: ZERO,
      reserveEarlyReleasedAmt: ZERO,
      feeAmount: ZERO,
      fees: [],
    }
    if (row.cycle === 'E') {
      const statusCode = row.statusCode!
      const declined = statusCode === 'Declined'
      const held = statusCode === 'Successful' ? percentOf(t.amount, t.appliedReservePct) : ZERO
      return {
        ...base,
        cycle: 'E',
        statusCode,
        amount: declined ? ZERO : text4(t.amount),
        eventDate: t.transactionDate,
        roundNo: null,
        expectedReserveReleaseAt: held === ZERO ? null : plusDays(t.transactionDate, days),
        reservePolicySnapshot: null,
        reserveHeldAmt: held,
      } satisfies MovementPlan
    }
    if (row.cycle === 'I') {
      const statusCode = row.statusCode!
      const eventDate = adjustmentDate(row, t)
      if (eventDate === null)
        warnings.push({
          code: 'undated_adjustment',
          transactionId: String(t.transactionId),
          sheetId: row.sheetId,
          rowNo: row.rowNo,
          feeSkipped: false,
        })
      return {
        ...base,
        cycle: 'I',
        statusCode,
        // A Chargeback, a Refund and an RDR all deduct the transaction amount (gate decision P2).
        amount: text4(t.amount),
        eventDate,
        roundNo: eInBatch.has(t.transactionId) ? 1 : ctx.previousE.has(t.transactionId) ? 2 : null,
        expectedReserveReleaseAt: null,
        // The policy of the account is recorded, not applied yet (#62).
        reservePolicySnapshot: JSON.stringify({ policy: ctx.policy, applied: false }),
      } satisfies MovementPlan
    }
    return {
      ...base,
      cycle: 'R',
      statusCode: t.statusCode,
      amount: ZERO,
      // The reserve expires at creation + the channel term: the same date that forms the R range (README §3.3).
      eventDate: plusDays(t.transactionDate, days),
      roundNo: null,
      expectedReserveReleaseAt: null,
      reservePolicySnapshot: null,
      reserveReleasedAmt: percentOf(t.amount, t.appliedReservePct),
    } satisfies MovementPlan
  })
  return { movements, warnings }
}

/**
 * Date of an adjustment (gate decision P6): the provider's date of the row; else the last status change, only when the
 * gateway holds the status of the row (otherwise it is the date of another event); else none — never an invented one.
 */
function adjustmentDate(row: SettlementRow, t: SettlementTransactionData): Date | null {
  if (row.txnDate !== null) return row.txnDate
  if (t.lastStatusChangedAt !== null && t.statusCode === row.statusCode) return t.lastStatusChangedAt
  return null
}

function transactionOf(row: SettlementRow): SettlementTransactionData {
  if (row.transaction === null) throw new Error(`row ${row.sheetId}:${row.rowNo} has no transaction`)
  return row.transaction
}

function reserveDays(ctx: MovementContext, channelId: number): number {
  const channel = ctx.channels.get(channelId)
  if (!channel) throw new Error(`channel ${channelId} of a movement is not in the input`)
  return channel.rollingReserveDays
}
