/**
 * In-memory double of ValidationRunRepository (validation-runs design D14): the guard and the optimistic version of
 * every write, runs with their findings and occurrences, and the AuditLog entries of the flow. Test seams change the
 * state directly (status, version, a review, an inclusion) or run a hook right before a write.
 */
import type {
  Cycle,
  ImportStatus,
  IssueHistoryEntry,
  IssueScope,
  IssueType,
  MissingRange,
  MissingType,
  RowLocation,
  StatusRef,
  UserRef,
  ValidationCode,
  ValidationIssueSummary,
  ValidationIssuesQuery,
} from '@recon/shared'
import { TRANSACTION_STATUSES } from '../../../../../prisma/synthetic.js'
import { ACCOUNT_IDS } from '../../../catalog/application/__fakes__/in-memory.js'
import type { Scope } from '../../../catalog/domain/scope.js'
import { ImportNotEditableError } from '../../../imports/domain/errors.js'
import type { CycleRanges, Occurrence, ValidationReport } from '../../domain/types.js'
import {
  BlockingValidationIssueError,
  ImportChangedError,
  ImportNotAnalyzedError,
  IssueAlreadyResolvedError,
  IssueNotResolvableError,
  OccurrenceNotEditableError,
  OccurrenceNotIncludableError,
  ValidationRunRequiredError,
  ValidationRunSupersededError,
} from '../errors.js'
import { compareIssueOrder } from '../issue-order.js'
import type {
  ImportRef,
  ReviewEvent,
  StoredIssueDetail,
  StoredOccurrence,
  StoredResult,
  StoredRun,
  ValidationRunRepository,
} from '../ports.js'
import { reserveRuleBlocks } from '../reserve-rule.js'
import { breakdownOf, breakdownView, type IssueDetailJson, issueDetailOf } from '../run-record.js'
import { validationWorld } from './in-memory.js'

const USER_NAMES: Record<number, string> = { 1: 'admin', 2: 'analyst', 3: 'viewer' }
const SET_INCLUSION = 'validation.occurrence.set_inclusion'
const RESOLVE = 'validation.issue.resolve'

/** What the double knows of the files and sheets of an import (InMemoryImportRepository.stored). */
export interface DescribedImport {
  files: { fileId: string; fileName: string; sheets: { sheetId: string; sheetName: string }[] }[]
}

export interface FakeImport {
  importId: string
  merchantId: number
  status: ImportStatus
  updatedAt: Date
}

export type FakeOccurrence = Occurrence & {
  occurrenceId: string
  issueId: number
  includeInSettlement: boolean
  changedBy: number | null
  changedAt: Date | null
}

export interface FakeIssue {
  issueId: number
  runId: number
  validationCode: string
  issueType: IssueType
  scope: IssueScope | null
  blocking: boolean
  transactionIdRaw: string | null
  transactionId: bigint | null
  cycle: Cycle | null
  statusId: number | null
  missingType: string | null
  relevantDate: Date | null
  detail: IssueDetailJson | null
  resolutionStatus: 'persistent' | 'resolved'
  resolvedBy: number | null
  resolvedAt: Date | null
  resolutionNote: string | null
  occurrences: FakeOccurrence[]
}

export interface FakeRun {
  runId: number
  importId: string
  runAt: Date
  runByUserId: number
  isSuperseded: boolean
  ranges: CycleRanges
  pendingInRangeCount: number
  undatedAdjustmentCount: number
  undatedCandidateCount: number
  results: StoredResult[]
  issues: FakeIssue[]
}

export interface FakeAuditEntry {
  userId: number
  action: string
  entityType: string
  entityId: string
  detail: Record<string, unknown>
  at: Date
}

export class InMemoryRunRepository implements ValidationRunRepository {
  private readonly imports = new Map<string, FakeImport>()
  private readonly runs: FakeRun[] = []
  readonly audit: FakeAuditEntry[] = []
  private nextRunId = 1
  private nextIssueId = 1
  private nextOccurrenceId = 1
  private clock = Date.parse('2026-10-18T09:00:00.000Z')
  /** Runs right before a write, after the caller read the import (simulates a concurrent writer). */
  beforeSave: (() => void) | null = null
  /** Returns the results of a run in reverse order (the service must not rely on the repository's order). */
  shuffleResults = false

  private readonly sheets = new Map<string, { fileId: string; fileName: string; sheetName: string; order: number }>()

  // ── test seams ──

  addImport(data: { importId: string; merchantId: number; status: ImportStatus }): void {
    this.imports.set(data.importId, { ...data, updatedAt: this.tick() })
  }

  /** File and sheet names for the locations of the findings. */
  describeImport(described: DescribedImport): void {
    described.files.forEach((file, fileIndex) => {
      file.sheets.forEach((sheet, sheetIndex) => {
        this.sheets.set(sheet.sheetId, {
          fileId: file.fileId,
          fileName: file.fileName,
          sheetName: sheet.sheetName,
          order: fileIndex * 1_000 + sheetIndex,
        })
      })
    })
  }

  setMerchant(importId: string, merchantId: number): void {
    this.requireImport(importId).merchantId = merchantId
  }

  /** Reassigns the issue ids in reverse: an order that relied on them would change. */
  reverseIssueIds(): void {
    const all = this.runs.flatMap((r) => r.issues)
    const ids = all.map((i) => i.issueId).reverse()
    all.forEach((issue, index) => {
      issue.issueId = ids[index] as number
      for (const o of issue.occurrences) o.issueId = issue.issueId
    })
  }

  /** An AuditLog entry of an inclusion change, as setInclusion writes it. */
  recordInclusionChange(occurrenceId: string, userId: number, to: boolean, at: Date): void {
    const issue = this.issueOfOccurrence(occurrenceId)
    this.audit.push({
      userId,
      action: SET_INCLUSION,
      entityType: 'ConflictOccurrence',
      entityId: occurrenceId,
      detail: { issueId: issue.issueId, runId: issue.runId, from: !to, to },
      at,
    })
  }

  setStatus(importId: string, status: ImportStatus): void {
    const imported = this.requireImport(importId)
    imported.status = status
    imported.updatedAt = this.tick()
  }

  /** Another writer confirmed on the import: its version changes. */
  touch(importId: string): void {
    this.requireImport(importId).updatedAt = this.tick()
  }

  runsOf(importId: string): FakeRun[] {
    return this.runs.filter((r) => r.importId === importId)
  }

  auditOf(importId: string): FakeAuditEntry[] {
    return this.audit.filter((e) => e.entityType === 'Import' && e.entityId === importId)
  }

  /** The import reviewed on a run, as POST review leaves it. */
  markReviewed(importId: string, runId: number, userId: number, at: Date): void {
    this.setStatus(importId, 'validated')
    this.audit.push({
      userId,
      action: 'import.review',
      entityType: 'Import',
      entityId: importId,
      detail: { runId, issueCounts: {}, changedOccurrences: 0 },
      at,
    })
  }

  setInclusionDirectly(occurrenceId: string, value: boolean, userId: number, at: Date): void {
    const occurrence = this.runs
      .flatMap((r) => r.issues.flatMap((i) => i.occurrences))
      .find((o) => o.occurrenceId === occurrenceId)
    if (!occurrence) throw new Error(`unknown occurrence ${occurrenceId}`)
    Object.assign(occurrence, { includeInSettlement: value, changedBy: userId, changedAt: at })
  }

  resolveDirectly(issueId: number, userId: number, at: Date, note = 'Resolved by hand'): void {
    const issue = this.runs.flatMap((r) => r.issues).find((i) => i.issueId === issueId)
    if (!issue) throw new Error(`unknown issue ${issueId}`)
    Object.assign(issue, { resolutionStatus: 'resolved', resolvedBy: userId, resolvedAt: at, resolutionNote: note })
  }

  // ── ValidationRunRepository ──

  async findImport(scope: Scope, importId: string): Promise<ImportRef | null> {
    const imported = this.imports.get(importId)
    if (!imported || !scope.merchantIds.includes(imported.merchantId)) return null
    return { importId, status: imported.status, updatedAt: imported.updatedAt }
  }

  async saveRun(importId: string, expectedUpdatedAt: Date, userId: number, report: ValidationReport, now: Date) {
    this.beforeSave?.()
    const imported = this.requireImport(importId)
    if (imported.status !== 'analyzed' && imported.status !== 'validated')
      throw new ImportNotAnalyzedError(imported.status)
    if (imported.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new ImportChangedError(imported.status)
    const previousStatus = imported.status
    const previous = this.runs.find((r) => r.importId === importId && !r.isSuperseded)
    if (previous) previous.isSuperseded = true
    const runId = this.nextRunId++
    this.runs.push({
      runId,
      importId,
      runAt: now,
      runByUserId: userId,
      isSuperseded: false,
      ranges: report.ranges,
      pendingInRangeCount: report.pendingInRangeCount,
      undatedAdjustmentCount: report.undatedAdjustmentCount,
      undatedCandidateCount: report.undatedCandidateCount,
      results: report.results.map((r) => ({
        validationCode: r.code,
        outcome: r.outcome,
        issueCount: r.issueCount,
        breakdown: breakdownView(breakdownOf(r)),
      })),
      issues: report.results.flatMap((r) =>
        r.issues.map((issue): FakeIssue => {
          const issueId = this.nextIssueId++
          return {
            issueId,
            runId,
            validationCode: r.code,
            issueType: issue.issueType,
            scope: issue.scope,
            blocking: issue.blocking,
            transactionIdRaw: issue.transactionIdRaw,
            transactionId: issue.transactionId,
            cycle: issue.cycle,
            statusId: issue.statusId,
            missingType: issue.missingType ?? null,
            relevantDate: issue.relevantDate ?? null,
            detail: issueDetailOf(issue),
            resolutionStatus: 'persistent',
            resolvedBy: null,
            resolvedAt: null,
            resolutionNote: null,
            occurrences: issue.occurrences.map((o) => ({
              ...o,
              occurrenceId: String(this.nextOccurrenceId++),
              issueId,
              includeInSettlement: o.defaultIncluded,
              changedBy: null,
              changedAt: null,
            })),
          }
        }),
      ),
    })
    imported.status = 'analyzed'
    imported.updatedAt = now
    if (previousStatus === 'validated' && previous) {
      const review = this.lastReviewOf(importId, previous.runId)
      this.audit.push({
        userId,
        action: 'import.review.invalidate',
        entityType: 'Import',
        entityId: importId,
        detail: {
          runId: previous.runId,
          reviewedByUserId: review?.userId ?? null,
          reviewedAt: review?.at.toISOString() ?? null,
          reason: 'rerun',
          newRunId: runId,
        },
        at: now,
      })
    }
    return { runId, previousStatus }
  }

  async currentRun(importId: string): Promise<StoredRun | null> {
    const run = this.runs.find((r) => r.importId === importId && !r.isSuperseded)
    if (!run) return null
    const occurrences = run.issues.flatMap((i) => i.occurrences)
    return {
      runId: run.runId,
      runAt: run.runAt,
      runBy: this.userRef(run.runByUserId),
      ranges: run.ranges,
      pendingInRangeCount: run.pendingInRangeCount,
      undatedAdjustmentCount: run.undatedAdjustmentCount,
      undatedCandidateCount: run.undatedCandidateCount,
      results: this.shuffleResults ? [...run.results].reverse() : run.results,
      manualChangeCount:
        occurrences.filter((o) => o.includeInSettlement !== o.defaultIncluded).length +
        run.issues.filter((i) => i.resolvedBy !== null).length,
    }
  }

  async reviewEvents(importId: string): Promise<ReviewEvent[]> {
    return this.auditOf(importId).flatMap((e): ReviewEvent[] => {
      if (e.action === 'import.review')
        return [{ kind: 'review', runId: e.detail.runId as number, by: this.userRef(e.userId), at: e.at }]
      if (e.action === 'import.review.invalidate')
        return [
          {
            kind: 'invalidate',
            runId: e.detail.runId as number,
            by: this.userRef(e.userId),
            at: e.at,
            reviewedBy: this.userRef(e.detail.reviewedByUserId as number),
            reviewedAt: new Date(e.detail.reviewedAt as string),
            reason: e.detail.reason as 'rerun' | 'inclusion_change',
            newRunId: (e.detail.newRunId as number | undefined) ?? null,
            occurrenceId: (e.detail.occurrenceId as string | undefined) ?? null,
          },
        ]
      return []
    })
  }

  async listIssues(importId: string, query: ValidationIssuesQuery) {
    const run = this.runs.find((r) => r.importId === importId && !r.isSuperseded)
    if (!run) return { items: [], total: 0 }
    const matching = run.issues
      .filter(
        (i) =>
          (query.type === undefined || i.issueType === query.type) &&
          (query.scope === undefined || i.scope === query.scope) &&
          (query.status === undefined || i.resolutionStatus === query.status) &&
          (query.validationCode === undefined || i.validationCode === query.validationCode) &&
          (query.cycle === undefined || i.cycle === query.cycle),
      )
      .map((i) => this.summaryOf(i))
      .sort(compareIssueOrder)
    const offset = (query.page - 1) * query.pageSize
    return { items: matching.slice(offset, offset + query.pageSize), total: matching.length }
  }

  async findIssue(scope: Scope, issueId: number): Promise<StoredIssueDetail | null> {
    const run = this.runs.find((r) => r.issues.some((i) => i.issueId === issueId))
    if (!run) return null
    const imported = this.requireImport(run.importId)
    if (!scope.merchantIds.includes(imported.merchantId)) return null
    const issue = run.issues.find((i) => i.issueId === issueId) as FakeIssue
    const occurrenceIds = new Set(issue.occurrences.map((o) => o.occurrenceId))
    const current = issue.occurrences
      .filter((o) => o.sourceType === 'current_import')
      .sort((a, b) => this.rowOrder(a) - this.rowOrder(b))
    const previous = issue.occurrences.filter((o) => o.sourceType === 'previous_batch')
    return {
      summary: this.summaryOf(issue),
      importId: run.importId,
      importStatus: imported.status,
      isCurrent: !run.isSuperseded,
      occurrences: [...current, ...previous].map((o) => this.occurrenceOf(o)),
      history: this.audit
        .filter(
          (e) =>
            (e.action === SET_INCLUSION && e.entityType === 'ConflictOccurrence' && occurrenceIds.has(e.entityId)) ||
            (e.action === RESOLVE && e.entityType === 'ValidationIssue' && e.entityId === String(issueId)),
        )
        .sort((a, b) => a.at.getTime() - b.at.getTime())
        .map(
          (e): IssueHistoryEntry => ({
            at: e.at.toISOString(),
            user: this.userRef(e.userId),
            action: e.action === SET_INCLUSION ? 'set_inclusion' : 'resolve',
            occurrenceId: e.action === SET_INCLUSION ? e.entityId : null,
            from: e.action === SET_INCLUSION ? (e.detail.from as boolean) : null,
            to: e.action === SET_INCLUSION ? (e.detail.to as boolean) : null,
            note: e.action === RESOLVE ? (e.detail.note as string) : null,
          }),
        ),
    }
  }

  async findOccurrence(scope: Scope, occurrenceId: string) {
    const issue = this.runs
      .flatMap((r) => r.issues)
      .find((i) => i.occurrences.some((o) => o.occurrenceId === occurrenceId))
    if (!issue) return null
    const run = this.runOf(issue)
    if (!scope.merchantIds.includes(this.requireImport(run.importId).merchantId)) return null
    return { occurrenceId, issueId: issue.issueId }
  }

  async setInclusion(occurrenceId: string, includeInSettlement: boolean, userId: number, now: Date): Promise<void> {
    this.beforeSave?.()
    const issue = this.issueOfOccurrence(occurrenceId)
    const run = this.runOf(issue)
    const imported = this.requireImport(run.importId)
    if (imported.status !== 'analyzed' && imported.status !== 'validated')
      throw new ImportNotEditableError(imported.status)
    if (run.isSuperseded)
      throw new ValidationRunSupersededError(run.runId, this.currentRunOf(run.importId)?.runId ?? null)
    const target = issue.occurrences.find((o) => o.occurrenceId === occurrenceId) as FakeOccurrence
    if (target.sourceType !== 'current_import') throw new OccurrenceNotEditableError(target.sourceType)
    if (target.includeInSettlement === includeInSettlement) return
    const blocked = reserveRuleBlocks(issue.cycle, issue.occurrences, target)
    if (includeInSettlement && blocked) throw new OccurrenceNotIncludableError(blocked)
    const previousStatus = imported.status
    Object.assign(target, { includeInSettlement, changedBy: userId, changedAt: now })
    imported.updatedAt = now
    this.audit.push({
      userId,
      action: SET_INCLUSION,
      entityType: 'ConflictOccurrence',
      entityId: occurrenceId,
      detail: {
        issueId: issue.issueId,
        runId: run.runId,
        importId: run.importId,
        from: !includeInSettlement,
        to: includeInSettlement,
      },
      at: now,
    })
    if (previousStatus === 'validated') {
      imported.status = 'analyzed'
      const review = this.lastReviewOf(run.importId, run.runId)
      this.audit.push({
        userId,
        action: 'import.review.invalidate',
        entityType: 'Import',
        entityId: run.importId,
        detail: {
          runId: run.runId,
          reviewedByUserId: review?.userId ?? null,
          reviewedAt: review?.at.toISOString() ?? null,
          reason: 'inclusion_change',
          occurrenceId,
        },
        at: now,
      })
    }
  }

  async resolveIssue(issueId: number, note: string, userId: number, now: Date): Promise<void> {
    const issue = this.runs.flatMap((r) => r.issues).find((i) => i.issueId === issueId)
    if (!issue) throw new Error(`unknown issue ${issueId}`)
    const run = this.runOf(issue)
    if (issue.issueType !== 'non_recorded_adjustment' && issue.issueType !== 'status_mismatch')
      throw new IssueNotResolvableError(issue.issueType)
    if (issue.resolutionStatus === 'resolved')
      throw new IssueAlreadyResolvedError(
        issue.resolvedAt?.toISOString() ?? null,
        issue.resolvedBy === null ? null : this.userRef(issue.resolvedBy),
      )
    if (run.isSuperseded)
      throw new ValidationRunSupersededError(run.runId, this.currentRunOf(run.importId)?.runId ?? null)
    Object.assign(issue, { resolutionStatus: 'resolved', resolvedBy: userId, resolvedAt: now, resolutionNote: note })
    this.audit.push({
      userId,
      action: RESOLVE,
      entityType: 'ValidationIssue',
      entityId: String(issueId),
      detail: { issueId, runId: run.runId, importId: run.importId, note },
      at: now,
    })
  }

  async review(importId: string, runId: number, userId: number, now: Date): Promise<void> {
    this.beforeSave?.()
    const imported = this.requireImport(importId)
    if (imported.status !== 'analyzed') throw new ImportNotAnalyzedError(imported.status)
    const current = this.currentRunOf(importId)
    if (!current) throw new ValidationRunRequiredError()
    if (current.runId !== runId) throw new ValidationRunSupersededError(runId, current.runId)
    const blocked = current.results.filter((r) => r.outcome === 'blocked')
    if (blocked.length > 0)
      throw new BlockingValidationIssueError(
        runId,
        blocked.map((r) => r.validationCode),
        current.issues.filter((i) => i.blocking).map((i) => i.issueId),
      )
    imported.status = 'validated'
    imported.updatedAt = now
    this.audit.push({
      userId,
      action: 'import.review',
      entityType: 'Import',
      entityId: importId,
      detail: {
        runId,
        issueCounts: Object.fromEntries(current.results.map((r) => [r.validationCode, r.issueCount])),
        changedOccurrences: current.issues
          .flatMap((i) => i.occurrences)
          .filter((o) => o.includeInSettlement !== o.defaultIncluded).length,
      },
      at: now,
    })
  }

  // ── helpers ──

  private runOf(issue: FakeIssue): FakeRun {
    return this.runs.find((r) => r.runId === issue.runId) as FakeRun
  }

  private currentRunOf(importId: string): FakeRun | undefined {
    return this.runs.find((r) => r.importId === importId && !r.isSuperseded)
  }

  private summaryOf(issue: FakeIssue): ValidationIssueSummary {
    const occurrences = issue.occurrences
    const source = issue.detail?.source
    return {
      issueId: issue.issueId,
      runId: issue.runId,
      validationCode: issue.validationCode as ValidationCode,
      issueType: issue.issueType,
      scope: issue.scope,
      blocking: issue.blocking,
      transactionIdRaw: issue.transactionIdRaw,
      transactionId: issue.transactionId === null ? null : String(issue.transactionId),
      cycle: issue.cycle,
      missingType: issue.missingType as MissingType | null,
      missingRange: (issue.detail?.missingRange as MissingRange | undefined) ?? null,
      relevantDate: issue.relevantDate?.toISOString() ?? null,
      status: statusRef(issue.statusId),
      gatewayStatus: statusRef(issue.detail?.gatewayStatusId ?? null),
      source: source ? this.locationOf(source.sheetId, source.rowNo) : null,
      resolutionStatus: issue.resolutionStatus,
      resolvedAt: issue.resolvedAt?.toISOString() ?? null,
      resolvedBy: issue.resolvedBy === null ? null : this.userRef(issue.resolvedBy),
      resolutionNote: issue.resolutionNote,
      occurrenceCount: occurrences.length,
      includedByDefaultCount: occurrences.filter((o) => o.defaultIncluded).length,
      includedCount: occurrences.filter((o) => o.includeInSettlement).length,
    }
  }

  private occurrenceOf(o: FakeOccurrence): StoredOccurrence {
    const common = {
      occurrenceId: o.occurrenceId,
      sourceType: o.sourceType,
      status: statusRef(o.statusId),
      excludeAmount: o.excludeAmount,
      defaultIncluded: o.defaultIncluded,
      includeInSettlement: o.includeInSettlement,
      changedBy: o.changedBy === null ? null : this.userRef(o.changedBy),
      changedAt: o.changedAt?.toISOString() ?? null,
    }
    if (o.sourceType === 'current_import')
      return { ...common, location: this.locationOf(o.sheetId, o.rowNo), batch: null }
    const settled = validationWorld().batches.find((b) => b.batchId === o.batchId)
    const accountName = Object.entries(ACCOUNT_IDS).find(([, id]) => id === o.accountId)?.[0] ?? 'unknown'
    return {
      ...common,
      location: o.sheetId === null || o.rowNo === null ? null : this.locationOf(o.sheetId, o.rowNo),
      batch: {
        batchId: fakeUuid(o.batchId),
        batchNo: o.batchNo,
        attemptNo: o.attemptNo,
        status: settled?.status ?? 'paid',
        accountId: o.accountId,
        accountName,
      },
    }
  }

  private locationOf(sheetId: string, rowNo: number): RowLocation | null {
    const sheet = this.sheets.get(sheetId)
    if (!sheet) return null
    return { fileId: sheet.fileId, fileName: sheet.fileName, sheetId, sheetName: sheet.sheetName, rowNo }
  }

  private rowOrder(o: FakeOccurrence): number {
    if (o.sourceType !== 'current_import') return 0
    return (this.sheets.get(o.sheetId)?.order ?? 0) * 1_000_000 + o.rowNo
  }

  private issueOfOccurrence(occurrenceId: string): FakeIssue {
    const issue = this.runs
      .flatMap((r) => r.issues)
      .find((i) => i.occurrences.some((o) => o.occurrenceId === occurrenceId))
    if (!issue) throw new Error(`unknown occurrence ${occurrenceId}`)
    return issue
  }

  userRef(userId: number): UserRef {
    return { userId, userName: USER_NAMES[userId] ?? `user-${userId}` }
  }

  private lastReviewOf(importId: string, runId: number): FakeAuditEntry | undefined {
    return this.auditOf(importId)
      .filter((e) => e.action === 'import.review' && e.detail.runId === runId)
      .at(-1)
  }

  private requireImport(importId: string): FakeImport {
    const imported = this.imports.get(importId)
    if (!imported) throw new Error(`unknown import ${importId}`)
    return imported
  }

  /** A strictly increasing version, as updatedAt changes on every write. */
  private tick(): Date {
    this.clock += 1_000
    return new Date(this.clock)
  }
}

function statusRef(statusId: number | null): StatusRef | null {
  const status = TRANSACTION_STATUSES.find((s) => s.statusId === statusId)
  return status ? { statusId: status.statusId, code: status.code, name: status.name } : null
}

/** The world's batch ids are readable keys; the API answers uuids: a stable uuid-shaped digest of the key. */
function fakeUuid(key: string): string {
  if (/^[0-9a-f-]{36}$/.test(key)) return key
  let hash = ''
  for (let seed = 0; hash.length < 32; seed++) {
    let h = 2166136261 ^ seed
    for (const char of key) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
    hash += (h >>> 0).toString(16).padStart(8, '0')
  }
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}
