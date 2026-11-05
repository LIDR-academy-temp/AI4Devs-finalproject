// The reserve of an adjusted transaction (settlement-reserve-chargeback D1; spec settlement "Política de reserva ante
// chargeback", "Reserva ya liberada por un ajuste"). With release_on_chargeback the first I movement of a transaction
// releases the whole reserve its E held, whatever its status (Chargeback, Refund or RDR) and amount (P1, P4); the
// policy is the processing account's (P2). An R of the same batch wins (P3), a reserve is released once (P5, P12).
import type { ChargebackReservePolicy } from '@recon/shared'
import { Decimal, ZERO } from './money.js'
import type {
  MovementPlan,
  PriorReserveState,
  ReservePolicyOutcome,
  ReservePolicySnapshot,
  SettlementWarning,
} from './types.js'

export interface AdjustmentReserveContext {
  policy: ChargebackReservePolicy
  reserveStates: ReadonlyMap<bigint, PriorReserveState>
}

/** Movements in processing order (buildMovements); E movements are returned as they are. */
export function applyAdjustmentReserve(
  movements: readonly MovementPlan[],
  ctx: AdjustmentReserveContext,
): { movements: MovementPlan[]; warnings: SettlementWarning[] } {
  const heldInBatch = new Map<bigint, string>()
  const rInBatch = new Set<bigint>()
  for (const m of movements) {
    if (m.cycle === 'E' && m.statusCode === 'Successful' && new Decimal(m.reserveHeldAmt).gt(0))
      if (!heldInBatch.has(m.transactionId)) heldInBatch.set(m.transactionId, m.reserveHeldAmt)
    if (m.cycle === 'R') rInBatch.add(m.transactionId)
  }
  const releasedInBatch = new Set<bigint>()
  const warnings: SettlementWarning[] = []

  const adjusted = movements.map((m): MovementPlan => {
    const prior = ctx.reserveStates.get(m.transactionId)
    if (m.cycle === 'R') {
      if (!prior?.releasedByAdjustment) return m
      warnings.push({
        code: 'reserve_already_released',
        transactionId: String(m.transactionId),
        sheetId: m.sheetId,
        rowNo: m.rowNo,
      })
      return { ...m, reserveReleasedAmt: ZERO }
    }
    if (m.cycle !== 'I') return m

    const source = prior?.held
      ? { amount: prior.held.amount, batchId: prior.held.batchId }
      : heldInBatch.has(m.transactionId)
        ? { amount: heldInBatch.get(m.transactionId)!, batchId: null }
        : null
    const outcome: ReservePolicyOutcome =
      ctx.policy === 'hold_until_term'
        ? 'held_until_term'
        : source === null
          ? 'no_held_reserve'
          : prior?.releasedInR || rInBatch.has(m.transactionId)
            ? 'released_in_r'
            : prior?.releasedByAdjustment || releasedInBatch.has(m.transactionId)
              ? 'already_released'
              : 'released'
    if (outcome === 'released') releasedInBatch.add(m.transactionId)
    const snapshot: ReservePolicySnapshot = {
      policy: ctx.policy,
      applied: true,
      outcome,
      heldInBatchId: outcome === 'held_until_term' ? null : (source?.batchId ?? null),
    }
    return {
      ...m,
      reserveEarlyReleasedAmt: outcome === 'released' ? source!.amount : ZERO,
      reservePolicySnapshot: JSON.stringify(snapshot),
    }
  })
  return { movements: adjusted, warnings }
}
