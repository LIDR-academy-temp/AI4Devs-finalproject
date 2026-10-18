/**
 * In-memory double of ValidationRunRepository (validation-runs design D14): the guard and the optimistic version of
 * every write, runs with their findings and occurrences, and the AuditLog entries of the flow. Test seams change the
 * state directly (status, version, a review, an inclusion) or run a hook right before a write.
 */
import type { Cycle, ImportStatus, IssueScope, IssueType, UserRef } from '@recon/shared'
import type { Scope } from '../../../catalog/domain/scope.js'
import type { CycleRanges, Occurrence, ValidationReport } from '../../domain/types.js'
import { ImportChangedError, ImportNotAnalyzedError } from '../errors.js'
import type { ImportRef, ReviewEvent, StoredResult, StoredRun, ValidationRunRepository } from '../ports.js'
import { breakdownOf, breakdownView, type IssueDetailJson, issueDetailOf } from '../run-record.js'

const USER_NAMES: Record<number, string> = { 1: 'admin', 2: 'analyst', 3: 'viewer' }

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

  // ── test seams ──

  addImport(data: { importId: string; merchantId: number; status: ImportStatus }): void {
    this.imports.set(data.importId, { ...data, updatedAt: this.tick() })
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

  // ── helpers ──

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
