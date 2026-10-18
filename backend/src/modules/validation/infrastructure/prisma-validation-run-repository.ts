// Prisma adapter of ValidationRunRepository (validation-runs design D4–D8, D16). Every write starts with a guarded
// UPDATE of the Import row, which holds its exclusive lock until commit: the writes of the flow serialize, and one
// computed on a version that changed meanwhile persists nothing (ImportChangedError).
import { type ImportStatus, InvalidationReason, ValidationCode, ValidationOutcome } from '@recon/shared'
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { MAX_SQL_PARAMETERS } from '../../imports/infrastructure/sql-limits.js'
import { ImportChangedError, ImportNotAnalyzedError } from '../application/errors.js'
import type { ImportRef, ReviewEvent, StoredRun, ValidationRunRepository } from '../application/ports.js'
import { breakdownOf, breakdownView, issueDetailOf, type StoredBreakdown } from '../application/run-record.js'
import type { Issue, ValidationReport } from '../domain/types.js'

type Tx = Prisma.TransactionClient

const UNIQUE_VIOLATION = 'P2002'
/** Bound columns of a ValidationIssue row in createMany (every column, defaults included). */
const ISSUE_COLUMNS = 16
const ISSUES_PER_STATEMENT = Math.floor(MAX_SQL_PARAMETERS / ISSUE_COLUMNS)
/** A run of the reference volume writes in well under a second (D14 bench); the default 5 s leaves no margin. */
const RUN_TX_TIMEOUT_MS = 60_000
const RUN_TX_MAX_WAIT_MS = 10_000

const REVIEW = 'import.review'
const INVALIDATE = 'import.review.invalidate'

function visibleAccount(scope: Scope): Prisma.AccountWhereInput {
  return { provider: { merchantId: { in: [...scope.merchantIds] } } }
}

const json = (value: unknown) => (value === null ? null : JSON.stringify(value))

export class PrismaValidationRunRepository implements ValidationRunRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findImport(scope: Scope, importId: string): Promise<ImportRef | null> {
    const row = await this.prisma.import.findFirst({
      where: { importId, account: visibleAccount(scope) },
      select: { importId: true, status: true, updatedAt: true },
    })
    return row === null ? null : { ...row, status: row.status as ImportStatus }
  }

  async saveRun(importId: string, expectedUpdatedAt: Date, userId: number, report: ValidationReport, now: Date) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const previousStatus = await this.claimForRun(tx, importId, expectedUpdatedAt, now)
          const previous = await tx.validationRun.findFirst({
            where: { importId, isSuperseded: false },
            select: { runId: true },
          })
          await tx.validationRun.updateMany({ where: { importId, isSuperseded: false }, data: { isSuperseded: true } })
          const { runId } = await tx.validationRun.create({
            data: {
              importId,
              runAt: now,
              runByUserId: userId,
              dateMinApp: report.ranges.APP?.min ?? null,
              dateMaxApp: report.ranges.APP?.max ?? null,
              dateMinDec: report.ranges.DEC?.min ?? null,
              dateMaxDec: report.ranges.DEC?.max ?? null,
              dateMinI: report.ranges.I?.min ?? null,
              dateMaxI: report.ranges.I?.max ?? null,
              dateMinR: report.ranges.R?.min ?? null,
              dateMaxR: report.ranges.R?.max ?? null,
              pendingInRangeCount: report.pendingInRangeCount,
              undatedAdjustmentCount: report.undatedAdjustmentCount,
              undatedCandidateCount: report.undatedCandidateCount,
            },
            select: { runId: true },
          })
          await this.writeResults(tx, runId, report)
          if (previousStatus === 'validated' && previous) {
            await this.recordInvalidation(tx, importId, previous.runId, userId, now, {
              reason: 'rerun',
              newRunId: runId,
            })
          }
          return { runId, previousStatus }
        },
        { timeout: RUN_TX_TIMEOUT_MS, maxWait: RUN_TX_MAX_WAIT_MS },
      )
    } catch (error) {
      // UX_ValidationRun_current_import is the last barrier: if it fires, another run won the race.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION)
        throw new ImportChangedError('analyzed')
      throw error
    }
  }

  /**
   * The guard of a run (D4): only from analyzed or validated with the version the caller read; it leaves the import
   * analyzed and answers the status it replaced. Two guarded statements instead of one with OUTPUT: each is atomic and
   * matches only the read version, so no other writer can slip between them.
   */
  private async claimForRun(tx: Tx, importId: string, expectedUpdatedAt: Date, now: Date): Promise<ImportStatus> {
    for (const status of ['validated', 'analyzed'] as const) {
      const claimed = await tx.import.updateMany({
        where: { importId, status, updatedAt: expectedUpdatedAt },
        data: { status: 'analyzed', updatedAt: now },
      })
      if (claimed.count === 1) return status
    }
    const current = await tx.import.findUnique({ where: { importId }, select: { status: true } })
    const status = current?.status ?? 'unknown'
    if (status !== 'analyzed' && status !== 'validated') throw new ImportNotAnalyzedError(status)
    throw new ImportChangedError(status)
  }

  /** Eight results in order, then the findings: one-row ones in batches, those with occurrences one by one (D5). */
  private async writeResults(tx: Tx, runId: number, report: ValidationReport): Promise<void> {
    await tx.validationResult.createMany({
      data: report.results.map((r) => ({
        runId,
        validationCode: r.code,
        outcome: r.outcome,
        issueCount: r.issueCount,
        detailJson: json(breakdownOf(r)),
      })),
    })
    const resultIds = new Map(
      (await tx.validationResult.findMany({ where: { runId }, select: { resultId: true, validationCode: true } })).map(
        (r) => [r.validationCode, r.resultId],
      ),
    )
    const plain: Prisma.ValidationIssueCreateManyInput[] = []
    const withOccurrences: { resultId: number; issue: Issue }[] = []
    for (const result of report.results) {
      const resultId = resultIds.get(result.code) as number
      for (const issue of result.issues) {
        if (issue.occurrences.length === 0) plain.push(issueRow(resultId, issue))
        else withOccurrences.push({ resultId, issue })
      }
    }
    for (let offset = 0; offset < plain.length; offset += ISSUES_PER_STATEMENT)
      await tx.validationIssue.createMany({ data: plain.slice(offset, offset + ISSUES_PER_STATEMENT) })

    // The file of a historical occurrence comes from the sheet its movement was settled from.
    const historicalSheets = [
      ...new Set(
        withOccurrences.flatMap(({ issue }) =>
          issue.occurrences.flatMap((o) => (o.sourceType === 'previous_batch' && o.sheetId ? [o.sheetId] : [])),
        ),
      ),
    ]
    const fileOfSheet = new Map(
      historicalSheets.length === 0
        ? []
        : (
            await tx.importSheet.findMany({
              where: { sheetId: { in: historicalSheets } },
              select: { sheetId: true, fileId: true },
            })
          ).map((s) => [s.sheetId, s.fileId]),
    )
    for (const { resultId, issue } of withOccurrences) {
      await tx.validationIssue.create({
        data: {
          ...issueRow(resultId, issue),
          occurrences: {
            createMany: {
              data: issue.occurrences.map((o) =>
                o.sourceType === 'current_import'
                  ? {
                      sourceType: o.sourceType,
                      fileId: o.fileId,
                      sheetId: o.sheetId,
                      rowNo: o.rowNo,
                      statusId: o.statusId,
                      includeInSettlement: o.defaultIncluded,
                      defaultIncluded: o.defaultIncluded,
                    }
                  : {
                      sourceType: o.sourceType,
                      batchId: o.batchId,
                      fileId: o.sheetId === null ? null : (fileOfSheet.get(o.sheetId) ?? null),
                      sheetId: o.sheetId,
                      rowNo: o.rowNo,
                      statusId: o.statusId,
                      includeInSettlement: o.defaultIncluded,
                      defaultIncluded: o.defaultIncluded,
                    },
              ),
            },
          },
        },
        select: { issueId: true },
      })
    }
  }

  /** AuditLog `import.review.invalidate` with the reviewer of the last review of that run copied (D16). */
  private async recordInvalidation(
    tx: Tx,
    importId: string,
    runId: number,
    userId: number,
    now: Date,
    extra: { reason: InvalidationReason; newRunId?: number; occurrenceId?: string },
  ): Promise<void> {
    // The reviews of an import are a handful: filtering by runId here avoids depending on the JSON text.
    const reviews = await tx.auditLog.findMany({
      where: { entityType: 'Import', entityId: importId, action: REVIEW },
      orderBy: [{ createdAt: 'desc' }, { auditId: 'desc' }],
      select: { userId: true, createdAt: true, detailJson: true },
    })
    const review = reviews.find((r) => JSON.parse(r.detailJson ?? '{}').runId === runId)
    await tx.auditLog.create({
      data: {
        userId,
        action: INVALIDATE,
        entityType: 'Import',
        entityId: importId,
        createdAt: now,
        detailJson: JSON.stringify({
          runId,
          reviewedByUserId: review?.userId ?? null,
          reviewedAt: review?.createdAt.toISOString() ?? null,
          ...extra,
        }),
      },
    })
  }

  async currentRun(importId: string): Promise<StoredRun | null> {
    const run = await this.prisma.validationRun.findFirst({
      where: { importId, isSuperseded: false },
      include: {
        runBy: { select: { userId: true, userName: true } },
        results: { select: { validationCode: true, outcome: true, issueCount: true, detailJson: true } },
      },
    })
    if (!run) return null
    const [counted] = await this.prisma.$queryRaw<{ changed: number | bigint; resolved: number | bigint }[]>`
      SELECT
        (SELECT COUNT(*) FROM [ConflictOccurrence] o
           JOIN [ValidationIssue] i ON i.[issueId] = o.[issueId]
           JOIN [ValidationResult] r ON r.[resultId] = i.[resultId]
          WHERE r.[runId] = ${run.runId} AND o.[includeInSettlement] <> o.[defaultIncluded]) AS changed,
        (SELECT COUNT(*) FROM [ValidationIssue] i
           JOIN [ValidationResult] r ON r.[resultId] = i.[resultId]
          WHERE r.[runId] = ${run.runId} AND i.[resolvedByUserId] IS NOT NULL) AS resolved`
    const range = (min: Date | null, max: Date | null) => (min === null || max === null ? null : { min, max })
    return {
      runId: run.runId,
      runAt: run.runAt,
      runBy: run.runBy,
      ranges: {
        APP: range(run.dateMinApp, run.dateMaxApp),
        DEC: range(run.dateMinDec, run.dateMaxDec),
        I: range(run.dateMinI, run.dateMaxI),
        R: range(run.dateMinR, run.dateMaxR),
      },
      pendingInRangeCount: run.pendingInRangeCount,
      undatedAdjustmentCount: run.undatedAdjustmentCount,
      undatedCandidateCount: run.undatedCandidateCount,
      results: run.results.map((r) => ({
        validationCode: ValidationCode.parse(r.validationCode),
        outcome: ValidationOutcome.parse(r.outcome),
        issueCount: r.issueCount,
        breakdown: breakdownView(r.detailJson === null ? null : (JSON.parse(r.detailJson) as StoredBreakdown)),
      })),
      manualChangeCount: Number(counted?.changed ?? 0) + Number(counted?.resolved ?? 0),
    }
  }

  async reviewEvents(importId: string): Promise<ReviewEvent[]> {
    const entries = await this.prisma.auditLog.findMany({
      where: { entityType: 'Import', entityId: importId, action: { in: [REVIEW, INVALIDATE] } },
      orderBy: [{ createdAt: 'asc' }, { auditId: 'asc' }],
      select: { action: true, createdAt: true, detailJson: true, user: { select: { userId: true, userName: true } } },
    })
    const details = entries.map((e) => JSON.parse(e.detailJson ?? '{}') as Record<string, unknown>)
    const reviewerIds = [
      ...new Set(details.map((d) => d.reviewedByUserId).filter((id): id is number => typeof id === 'number')),
    ]
    const reviewers = new Map(
      (
        await this.prisma.user.findMany({
          where: { userId: { in: reviewerIds } },
          select: { userId: true, userName: true },
        })
      ).map((u) => [u.userId, u]),
    )
    return entries.flatMap((e, index): ReviewEvent[] => {
      const detail = details[index] as Record<string, unknown>
      const by = e.user ?? { userId: 0, userName: 'unknown' }
      if (e.action === REVIEW) return [{ kind: 'review', runId: Number(detail.runId), by, at: e.createdAt }]
      const reviewerId = detail.reviewedByUserId as number | null
      return [
        {
          kind: 'invalidate',
          runId: Number(detail.runId),
          by,
          at: e.createdAt,
          reviewedBy: (reviewerId === null ? undefined : reviewers.get(reviewerId)) ?? {
            userId: 0,
            userName: 'unknown',
          },
          reviewedAt: new Date(String(detail.reviewedAt ?? e.createdAt.toISOString())),
          reason: InvalidationReason.parse(detail.reason),
          newRunId: typeof detail.newRunId === 'number' ? detail.newRunId : null,
          occurrenceId: typeof detail.occurrenceId === 'string' ? detail.occurrenceId : null,
        },
      ]
    })
  }
}

function issueRow(resultId: number, issue: Issue): Prisma.ValidationIssueCreateManyInput {
  return {
    resultId,
    issueType: issue.issueType,
    scope: issue.scope,
    blocking: issue.blocking,
    transactionIdRaw: issue.transactionIdRaw,
    transactionId: issue.transactionId,
    cycle: issue.cycle,
    statusId: issue.statusId,
    missingType: issue.missingType ?? null,
    relevantDate: issue.relevantDate ?? null,
    detailJson: json(issueDetailOf(issue)),
  }
}
