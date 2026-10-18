import { performance } from 'node:perf_hooks'
import {
  type ImportStatus,
  isApproved,
  ValidationCode,
  type ValidationIssueDetail,
  type ValidationIssuesPage,
  type ValidationIssuesQuery,
  type ValidationResultView,
  type ValidationRunView,
} from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { runValidations } from '../domain/run-validations.js'
import type { CycleRanges } from '../domain/types.js'
import { ImportNotAnalyzedError } from './errors.js'
import { loadValidationInput } from './load-validation-input.js'
import type {
  ImportRef,
  ReviewEvent,
  StoredIssueDetail,
  StoredRun,
  ValidationRunRepository,
  ValidationSources,
} from './ports.js'
import { reserveRuleBlocks } from './reserve-rule.js'

export interface ValidationServiceDeps {
  sources: ValidationSources
  runs: ValidationRunRepository
  log: { info(obj: object, msg: string): void }
  now?: () => Date
}

/** Validating is accepted in `analyzed` and in `validated`, which goes back to `analyzed` (P1). */
const VALIDATABLE: ReadonlySet<ImportStatus> = new Set(['analyzed', 'validated'])

const iso = (date: Date) => date.toISOString()

/** Runs, findings, the analyst's actions and the review of an import (README HU2, §4.4; validation-runs design). */
export class ValidationService {
  private readonly now: () => Date

  constructor(private readonly deps: ValidationServiceDeps) {
    this.now = deps.now ?? (() => new Date())
  }

  /** `POST /imports/{id}/validations` (D4): load and engine outside the transaction, guarded write. */
  async run(scope: Scope, userId: number, importId: string): Promise<ValidationRunView> {
    const ref = await this.requireImport(scope, importId)
    if (!VALIDATABLE.has(ref.status)) throw new ImportNotAnalyzedError(ref.status)
    const started = performance.now()
    const { input } = await loadValidationInput(this.deps.sources, importId)
    const loaded = performance.now()
    const report = runValidations(input)
    const computed = performance.now()
    const { runId } = await this.deps.runs.saveRun(importId, ref.updatedAt, userId, report, this.now())
    const written = performance.now()
    this.deps.log.info(
      {
        importId,
        runId,
        loadMs: Math.round(loaded - started),
        engineMs: Math.round(computed - loaded),
        writeMs: Math.round(written - computed),
      },
      'validation run stored',
    )
    return this.viewOf(await this.requireImport(scope, importId))
  }

  /** `GET /imports/{id}/validations`: the current run (or null) and the last invalidated review. */
  async getCurrentRun(scope: Scope, importId: string): Promise<ValidationRunView> {
    return this.viewOf(await this.requireImport(scope, importId))
  }

  /** `GET /imports/{id}/validation-issues`: the current run's findings, filtered and paged (D8). */
  async listIssues(scope: Scope, importId: string, query: ValidationIssuesQuery): Promise<ValidationIssuesPage> {
    await this.requireImport(scope, importId)
    const { items, total } = await this.deps.runs.listIssues(importId, query)
    return { items, page: query.page, pageSize: query.pageSize, total }
  }

  /**
   * `GET /validation-issues/{id}`: the finding with its occurrences and history, and what the caller may do with it
   * (`canProcess`: the caller holds settlement.process) so the screen does not repeat the rules (D9).
   */
  async getIssue(scope: Scope, canProcess: boolean, issueId: number): Promise<ValidationIssueDetail> {
    const stored = await this.deps.runs.findIssue(scope, issueId)
    if (!stored) throw new NotFoundError('Validation issue')
    return detailOf(stored, canProcess)
  }

  private async requireImport(scope: Scope, importId: string): Promise<ImportRef> {
    const ref = await this.deps.runs.findImport(scope, importId)
    if (!ref) throw new NotFoundError('Import')
    return ref
  }

  private async viewOf(ref: ImportRef): Promise<ValidationRunView> {
    const [run, events] = await Promise.all([
      this.deps.runs.currentRun(ref.importId),
      this.deps.runs.reviewEvents(ref.importId),
    ])
    return {
      importId: ref.importId,
      importStatus: ref.status,
      run: run === null ? null : runSummary(run, events),
      lastInvalidatedReview: lastInvalidation(events),
    }
  }
}

/** Only these findings are resolved by hand (P5). */
const RESOLVABLE_TYPES: ReadonlySet<string> = new Set(['non_recorded_adjustment', 'status_mismatch'])
/** Inclusions change in analyzed and in validated, which goes back to analyzed (P4). */
const INCLUSION_EDITABLE: ReadonlySet<ImportStatus> = new Set(['analyzed', 'validated'])

function detailOf(stored: StoredIssueDetail, canProcess: boolean): ValidationIssueDetail {
  const { summary } = stored
  const occurrences = stored.occurrences.map((o) => {
    const editable =
      canProcess && stored.isCurrent && o.sourceType === 'current_import' && INCLUSION_EDITABLE.has(stored.importStatus)
    const includable = editable && reserveRuleBlocks(summary.cycle, stored.occurrences, o) === null
    return { ...o, editable, includable }
  })
  return {
    ...summary,
    importId: stored.importId,
    importStatus: stored.importStatus,
    run: { runId: summary.runId, isCurrent: stored.isCurrent },
    resolvable:
      canProcess &&
      stored.isCurrent &&
      RESOLVABLE_TYPES.has(summary.issueType) &&
      summary.resolutionStatus === 'persistent',
    occurrences,
    history: stored.history,
  }
}

function runSummary(run: StoredRun, events: ReviewEvent[]): NonNullable<ValidationRunView['run']> {
  const byCode = new Map(run.results.map((r) => [r.validationCode, r]))
  const results: ValidationResultView[] = ValidationCode.options.map((code) => {
    const stored = byCode.get(code)
    if (!stored) throw new Error(`run ${run.runId} has no result for ${code}`)
    return {
      validationCode: code,
      outcome: stored.outcome,
      issueCount: stored.issueCount,
      blocking: stored.outcome === 'blocked',
      approved: isApproved(stored.outcome),
      breakdown: stored.breakdown,
    }
  })
  const review = validReview(run.runId, events)
  return {
    runId: run.runId,
    runAt: iso(run.runAt),
    runBy: run.runBy,
    blocked: results.some((r) => r.blocking),
    ranges: rangesView(run.ranges),
    pendingInRangeCount: run.pendingInRangeCount,
    undatedAdjustmentCount: run.undatedAdjustmentCount,
    undatedCandidateCount: run.undatedCandidateCount,
    results,
    manualChangeCount: run.manualChangeCount,
    review: review === null ? null : { reviewedBy: review.by, reviewedAt: iso(review.at) },
  }
}

function rangesView(ranges: CycleRanges) {
  const view = (r: CycleRanges[keyof CycleRanges]) => (r === null ? null : { min: iso(r.min), max: iso(r.max) })
  return { APP: view(ranges.APP), DEC: view(ranges.DEC), I: view(ranges.I), R: view(ranges.R) }
}

/** The last review of the run, unless an invalidation of that run came after it. */
function validReview(runId: number, events: ReviewEvent[]) {
  let review: Extract<ReviewEvent, { kind: 'review' }> | null = null
  for (const e of events) {
    if (e.runId !== runId) continue
    review = e.kind === 'review' ? e : null
  }
  return review
}

function lastInvalidation(events: ReviewEvent[]): ValidationRunView['lastInvalidatedReview'] {
  const last = events.filter((e) => e.kind === 'invalidate').at(-1)
  if (!last) return null
  return {
    runId: last.runId,
    reviewedBy: last.reviewedBy,
    reviewedAt: iso(last.reviewedAt),
    invalidatedBy: last.by,
    invalidatedAt: iso(last.at),
    reason: last.reason,
    newRunId: last.newRunId,
    occurrenceId: last.occurrenceId,
  }
}
