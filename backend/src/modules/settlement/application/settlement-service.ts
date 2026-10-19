// Processing a batch, its preview and the proposed number (settlement-process design D5, D7, D19; README §4.3, §4.4).
import type { NextBatchNumber, SettlementPreview, SettlementRequest, SettlementView } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { assertCanProcess } from '../../imports/domain/import-state.js'
import { proposeBatchNumber } from '../domain/batch-number.js'
import { channelsToAssignFor } from '../domain/channels.js'
import { computeSettlement, type SettlementPlan } from '../domain/compute-settlement.js'
import {
  BatchFeeInvalidError,
  BlockingValidationIssueError,
  ValidationRunRequiredError,
  ValidationRunSupersededError,
} from './errors.js'
import { loadSettlementInput } from './load-settlement-input.js'
import type { PrefilledBatchFees, SettlementReader, SettlementRepository, SettlementSource } from './ports.js'

export interface SettlementServiceDeps {
  /** The reads outside a transaction (preview, scope checks, number). */
  source: SettlementSource
  prefilled: PrefilledBatchFees
  repository: SettlementRepository
  reader: SettlementReader
  /** Audit instants; tests fix it. */
  clock?: () => Date
}

export class SettlementService {
  private readonly clock: () => Date

  constructor(private readonly deps: SettlementServiceDeps) {
    this.clock = deps.clock ?? (() => new Date())
  }

  /** The number processing would take when the request omits it: a proposal, not a reservation. */
  async nextBatchNumber(scope: Scope, accountId: string, importId?: string): Promise<NextBatchNumber> {
    const account = await this.deps.source.account(scope, accountId)
    if (account === null) throw new NotFoundError('Account')
    if (importId !== undefined) {
      const context = await this.deps.source.importContext(scope, importId)
      if (context === null || context.account.accountId !== accountId) throw new NotFoundError('Import')
    }
    const proposed = proposeBatchNumber(await this.deps.source.attempts(accountId), importId ?? null)
    return { accountId, ...proposed }
  }

  /** The same calculation as processing, without writing nor auditing anything (design D19). */
  async preview(scope: Scope, importId: string, request: SettlementRequest): Promise<SettlementPreview> {
    const context = await this.deps.source.importContext(scope, importId)
    if (context === null) throw new NotFoundError('Import')
    assertCanProcess(context.status)
    const run = await this.deps.source.currentRun(importId)
    if (run === null) throw new ValidationRunRequiredError()
    if (run.runId !== request.runId) throw new ValidationRunSupersededError(request.runId, run.runId)
    if (run.blocked)
      throw new BlockingValidationIssueError(run.runId, run.blocked.validationCodes, run.blocked.issueIds)
    const plan = computeSettlement(
      await loadSettlementInput(this.deps.source, {
        importId,
        account: context.account,
        run,
        prefilledFeeTypeIds: await this.deps.prefilled.feeTypeIdsOf(scope, importId),
        request,
        options: { transactionalFees: true },
      }),
    )
    if (plan.batchFeeError) throw new BatchFeeInvalidError(plan.batchFeeError.index, plan.batchFeeError.reason)
    return previewOf(plan, importId, context.account.accountId, run.runId, scope)
  }

  /** Processing in one transaction (the repository); answers the attempt read back from what was written. */
  async process(scope: Scope, userId: number, importId: string, request: SettlementRequest): Promise<SettlementView> {
    const context = await this.deps.source.importContext(scope, importId)
    if (context === null) throw new NotFoundError('Import')
    // A fast answer; the guard inside the transaction is the one that counts.
    assertCanProcess(context.status)
    const { batchId } = await this.deps.repository.process({
      importId,
      userId,
      request,
      prefilledFeeTypeIds: await this.deps.prefilled.feeTypeIdsOf(scope, importId),
      now: this.clock(),
      scope,
    })
    const view = await this.deps.reader.view(batchId, scope)
    if (view === null) throw new Error(`processed batch ${batchId} cannot be read back`)
    return view
  }
}

const iso = (range: { min: Date; max: Date } | null) =>
  range === null ? null : { min: range.min.toISOString(), max: range.max.toISOString() }

export function previewOf(
  plan: SettlementPlan,
  importId: string,
  accountId: string,
  runId: number,
  scope?: Scope,
): SettlementPreview {
  const { summary } = plan
  const count = (cycle: string) => plan.movements.filter((m) => m.cycle === cycle).length
  return {
    importId,
    accountId,
    runId,
    batchNo: plan.batchNo,
    attemptNo: plan.attemptNo,
    batchNoAvailable: plan.batchNoAvailable,
    requiresChannelConfirmation: plan.channels.toAssign.length > 0,
    channelsToAssign: channelsToAssignFor(scope, plan.channels.toAssign),
    dateRanges: {
      APP: iso(plan.dateRanges.APP),
      DEC: iso(plan.dateRanges.DEC),
      I: iso(plan.dateRanges.I),
      R: iso(plan.dateRanges.R),
    },
    channels: plan.channels.names,
    movements: { E: count('E'), I: count('I'), R: count('R') },
    totals: summary.totals,
    brandTotals: summary.brandTotals,
    reservesReleasedQty: summary.reservesReleasedQty,
    mdrAmt: summary.mdrAmt,
    mdrRate: summary.mdrRate,
    transactionalFeeAmt: summary.transactionalFeeAmt,
    batchFees: plan.batchFees.map((f) => ({ ...f, batchFeeId: null, enteredBy: null })),
    otherFeeAmt: summary.otherFeeAmt,
    reserveHeldAmt: summary.reserveHeldAmt,
    reserveReleasedAmt: summary.reserveReleasedAmt,
    reserveEarlyReleasedAmt: summary.reserveEarlyReleasedAmt,
    amountPayable: summary.amountPayable,
    payableBreakdown: summary.payableBreakdown,
    skipped: plan.skipped,
    warnings: plan.warnings,
  }
}
