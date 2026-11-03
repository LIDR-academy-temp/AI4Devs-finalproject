// The fee administration (README §4.1, §4.4; spec fees; admin-fees design D3, D6, D10): create, correct, close and
// change from a date. Every write runs under the account lock and leaves its FeeHistory row and its AuditLog entry
// in the same transaction.
import { randomUUID } from 'node:crypto'
import type { AccountFee, FeeCreate, FeePatch, FeeUpdateResult } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { FeeOverlapError, FeeRuleError } from '../domain/errors.js'
import { type FeeState, planCreate, planPatch } from '../domain/fee-patch.js'
import { findOverlaps, statusOf } from '../domain/fee-validity.js'
import { newYorkToday, type Today } from './fee-read-service.js'
import type { FeeAdminRepository, FeeAdminUnit, StoredFee } from './ports.js'

export class FeeAdminService {
  constructor(
    private readonly repository: FeeAdminRepository,
    private readonly today: Today = newYorkToday,
    private readonly newId: () => string = randomUUID,
  ) {}

  async create(scope: Scope, userId: number, accountId: string, body: FeeCreate): Promise<AccountFee> {
    const today = this.today()
    const stored = await this.repository.inAccount(scope, accountId, async (unit) => {
      await assertActiveType(unit, body.feeTypeId)
      const fee = planCreate(body, this.newId())
      await assertNoOverlap(unit, accountId, fee)

      await unit.insert(accountId, fee, userId)
      await unit.history({ feeId: fee.feeId, action: 'created', before: null, after: fee, reason: null, userId })
      await unit.audit({ action: 'fee.create', feeId: fee.feeId, detail: {}, userId })
      return unit.stored(fee.feeId)
    })
    if (stored === null) throw new NotFoundError('Account')
    return view(stored, today)
  }

  async patch(scope: Scope, userId: number, feeId: string, body: FeePatch): Promise<FeeUpdateResult> {
    const today = this.today()
    const accountId = await this.repository.accountOfFee(scope, feeId)
    if (accountId === null) throw new NotFoundError('Fee')
    const reason = body.reason ?? null

    const result = await this.repository.inAccount(scope, accountId, async (unit) => {
      const current = await unit.fee(feeId)
      if (current === null || !sameId(current.accountId, accountId)) throw new NotFoundError('Fee')
      const { accountId: _, ...state } = current
      const plan = planPatch(state, await unit.usage(feeId), body, this.newId())

      if (plan.kind === 'correct') {
        if (plan.changed.length === 0) return { fee: await unit.stored(feeId), successor: null }
        if (plan.changed.includes('startDate') || plan.changed.includes('endDate'))
          await assertNoOverlap(unit, accountId, plan.after)

        await unit.update(plan.after)
        await unit.history({ feeId, action: plan.action, before: plan.before, after: plan.after, reason, userId })
        await unit.audit(
          plan.action === 'closed'
            ? { action: 'fee.close', feeId, detail: withReason({ endDate: plan.after.endDate }, reason), userId }
            : { action: 'fee.update', feeId, detail: withReason({ changed: plan.changed }, reason), userId },
        )
        return { fee: await unit.stored(feeId), successor: null }
      }

      // A successor is a new fee: its type must still be active, as for a creation.
      await assertActiveType(unit, plan.successor.feeTypeId)
      await assertNoOverlap(unit, accountId, plan.successor, [plan.closed])
      // The original first, so that the trigger already sees it closed when the successor arrives (design D6).
      await unit.update(plan.closed)
      await unit.insert(accountId, plan.successor, userId)
      const successorId = plan.successor.feeId
      await unit.history({ feeId, action: 'closed', before: plan.before, after: plan.closed, reason, userId })
      await unit.history({ feeId: successorId, action: 'created', before: null, after: plan.successor, reason, userId })
      await unit.audit({
        action: 'fee.change',
        feeId,
        detail: withReason({ successorFeeId: successorId, effectiveFrom: plan.successor.startDate }, reason),
        userId,
      })
      return { fee: await unit.stored(feeId), successor: await unit.stored(successorId) }
    })
    if (result === null) throw new NotFoundError('Fee')
    return {
      fee: view(result.fee, today),
      successor: result.successor === null ? null : view(result.successor, today),
    }
  }
}

/** The fee in API form; `today` is read once per request, so every fee of a response has the same day. */
const view = (fee: StoredFee, today: string): AccountFee => ({ ...fee, status: statusOf(fee, today) })

async function assertActiveType(unit: FeeAdminUnit, feeTypeId: number): Promise<void> {
  const type = await unit.feeType(feeTypeId)
  if (type === null || !type.isActive) throw new FeeRuleError('feeTypeId', 'Unknown or inactive fee type')
}

/**
 * The other fees of the type in the account must not intersect the candidate. `replacing` are rows of this same
 * write that stand in for the stored ones (the closed original of a change from a date).
 */
async function assertNoOverlap(
  unit: FeeAdminUnit,
  accountId: string,
  candidate: FeeState,
  replacing: readonly FeeState[] = [],
): Promise<void> {
  const stored = await unit.feesOfType(accountId, candidate.feeTypeId)
  const others = stored.map((f) => replacing.find((r) => sameId(r.feeId, f.feeId)) ?? f)
  const conflicts = findOverlaps(candidate, others)
  if (conflicts.length > 0)
    throw new FeeOverlapError(conflicts.map((c) => ({ feeId: c.feeId, startDate: c.startDate, endDate: c.endDate })))
}

const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const withReason = (detail: Record<string, unknown>, reason: string | null) =>
  reason === null ? detail : { ...detail, reason }
