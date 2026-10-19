import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ValidationCode } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Issue, Occurrence, ValidationReport } from '../../src/modules/validation/domain/types.js'
import { PrismaValidationRunRepository } from '../../src/modules/validation/infrastructure/prisma-validation-run-repository.js'
import { createTestApp } from './helpers.js'
import { ImportFlow } from './import-flow.js'

// Bulk write of a run (validation-runs design D5, bench diagnosis): a run with tens of thousands of findings is written
// in bulk, inside the guarded transaction, with every field kept and each occurrence on its own finding. The report is
// synthetic and stored on a real analyzed import; its ids point at seeded rows so the foreign keys hold.
const MISSING = 20_000
const DUPLICATES = 300
const WRITE_BUDGET_MS = 3_000

let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-validation-write-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
})

afterAll(async () => {
  if (ctx) {
    await flow.close()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

describe('a run of 20 000 missing findings and 300 duplicates', () => {
  let runId: number
  let phases: Record<string, number>
  let transactionIds: bigint[]
  let batchId: string
  let sheet: { sheetId: string; fileId: string }

  /** Distinct raw ids per finding, so each stored finding can be found back. */
  const raw = (kind: string, n: number) => `${kind}-${String(n).padStart(6, '0')}`
  const relevantDate = (n: number) => new Date(Date.UTC(2026, 8, 1) + n * 61_000 + 123)

  beforeAll(async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    sheet = await ctx.prisma.importSheet.findFirstOrThrow({
      where: { file: { importId } },
      select: { sheetId: true, fileId: true },
    })
    transactionIds = (await ctx.prisma.transaction.findMany({ select: { transactionId: true }, take: 5_000 })).map(
      (t) => t.transactionId,
    )
    batchId = (await ctx.prisma.settlementBatch.findFirstOrThrow({ select: { batchId: true } })).batchId
    const tx = (n: number) => transactionIds[n % transactionIds.length] as bigint
    const ranges = ['APP', 'DEC', 'I', 'R'] as const

    const missing: Issue[] = Array.from({ length: MISSING }, (_, n) => ({
      issueType: 'missing',
      scope: 'in_range',
      blocking: false,
      transactionIdRaw: raw('m', n),
      transactionId: tx(n),
      cycle: ranges[n % 4] === 'I' ? 'I' : ranges[n % 4] === 'R' ? 'R' : 'E',
      statusId: n % 7 === 0 ? null : 2,
      missingType: 'in_range',
      missingRange: ranges[n % 4],
      relevantDate: relevantDate(n),
      occurrences: [],
    }))
    const current = (rowNo: number, statusId: number | null, defaultIncluded: boolean): Occurrence => ({
      sourceType: 'current_import',
      fileId: sheet.fileId,
      sheetId: sheet.sheetId,
      rowNo,
      statusId,
      excludeAmount: false,
      defaultIncluded,
    })
    const previous: Occurrence = {
      sourceType: 'previous_batch',
      batchId,
      batchNo: 1,
      attemptNo: 1,
      accountId: '00000000-0000-4000-8000-000000000000',
      sheetId: null,
      rowNo: null,
      statusId: 2,
      excludeAmount: false,
      defaultIncluded: true,
    }
    const duplicates: Issue[] = Array.from({ length: DUPLICATES }, (_, n) => ({
      issueType: 'duplicate',
      scope: n % 3 === 0 ? 'across_batches' : 'in_batch',
      blocking: false,
      transactionIdRaw: raw('d', n),
      transactionId: tx(MISSING + n),
      cycle: 'E',
      statusId: 2,
      occurrences:
        n % 3 === 0
          ? [current(10_000 + n, n === 3 ? null : 2, false), previous]
          : [current(20_000 + 2 * n, 2, true), current(20_001 + 2 * n, 2, false)],
    }))
    const nra: Issue = {
      issueType: 'non_recorded_adjustment',
      scope: null,
      blocking: false,
      transactionIdRaw: raw('n', 0),
      transactionId: tx(0),
      cycle: 'I',
      statusId: 4,
      gatewayStatusId: 2,
      source: { fileId: sheet.fileId, sheetId: sheet.sheetId, rowNo: 7 },
      occurrences: [],
    }
    const issuesOf: Partial<Record<ValidationCode, Issue[]>> = {
      non_recorded_adjustment: [nra],
      duplicate_in_batch: duplicates.filter((d) => d.scope === 'in_batch'),
      duplicate_across_batches: duplicates.filter((d) => d.scope === 'across_batches'),
      missing_in_range: missing,
    }
    const report: ValidationReport = {
      results: ValidationCode.options.map((code) => {
        const issues = issuesOf[code] ?? []
        return { code, outcome: issues.length > 0 ? 'warning' : 'passed', issueCount: issues.length, issues }
      }),
      blocked: false,
      ranges: { APP: null, DEC: null, I: null, R: null },
      pendingInRangeCount: 0,
      undatedAdjustmentCount: 0,
      undatedCandidateCount: 0,
    }
    const imported = await ctx.prisma.import.findUniqueOrThrow({ where: { importId } })

    const saved = await new PrismaValidationRunRepository(ctx.prisma).saveRun(
      importId,
      imported.updatedAt,
      flow.userIds.analyst,
      report,
      new Date(),
    )

    runId = saved.runId
    phases = saved.phases as unknown as Record<string, number>
    console.info(`[write] ${MISSING + DUPLICATES + 1} findings: ${JSON.stringify(phases)}`)
  }, 300_000)

  it('stores every finding and every occurrence', async () => {
    expect(await ctx.prisma.validationIssue.count({ where: { result: { runId } } })).toBe(MISSING + DUPLICATES + 1)
    expect(await ctx.prisma.conflictOccurrence.count({ where: { issue: { result: { runId } } } })).toBe(DUPLICATES * 2)
  })

  it('keeps every field of a missing finding: range, date to the millisecond, cycle, status, transaction', async () => {
    for (const n of [0, 1, 2, 3, 7, MISSING - 1]) {
      const stored = await ctx.prisma.validationIssue.findFirstOrThrow({
        where: { result: { runId }, transactionIdRaw: raw('m', n) },
        include: { result: { select: { validationCode: true } } },
      })
      expect(stored).toMatchObject({
        issueType: 'missing',
        scope: 'in_range',
        blocking: false,
        missingType: 'in_range',
        resolutionStatus: 'persistent',
        statusId: n % 7 === 0 ? null : 2,
        transactionId: transactionIds[n % transactionIds.length],
        relevantDate: relevantDate(n),
        result: { validationCode: 'missing_in_range' },
      })
      expect(JSON.parse(stored.detailJson ?? '{}')).toEqual({ missingRange: ['APP', 'DEC', 'I', 'R'][n % 4] })
    }
  })

  it('keeps the gateway status and the source row of a one-row finding', async () => {
    const stored = await ctx.prisma.validationIssue.findFirstOrThrow({
      where: { result: { runId }, transactionIdRaw: raw('n', 0) },
    })

    expect(stored).toMatchObject({ issueType: 'non_recorded_adjustment', scope: null, cycle: 'I', statusId: 4 })
    expect(JSON.parse(stored.detailJson ?? '{}')).toEqual({
      gatewayStatusId: 2,
      source: { fileId: sheet.fileId, sheetId: sheet.sheetId, rowNo: 7 },
    })
  })

  it('puts each occurrence on its own finding, with its inclusion, status and origin', async () => {
    const stored = await ctx.prisma.validationIssue.findMany({
      where: { result: { runId }, issueType: 'duplicate' },
      select: {
        transactionIdRaw: true,
        occurrences: {
          select: {
            sourceType: true,
            rowNo: true,
            statusId: true,
            batchId: true,
            fileId: true,
            includeInSettlement: true,
            defaultIncluded: true,
          },
          orderBy: { occurrenceId: 'asc' },
        },
      },
    })
    expect(stored).toHaveLength(DUPLICATES)
    for (const issue of stored) {
      const n = Number(issue.transactionIdRaw?.slice(2))
      const expected =
        n % 3 === 0
          ? [
              ['current_import', 10_000 + n, n === 3 ? null : 2, null, sheet.fileId, false],
              ['previous_batch', null, 2, batchId, null, true],
            ]
          : [
              ['current_import', 20_000 + 2 * n, 2, null, sheet.fileId, true],
              ['current_import', 20_001 + 2 * n, 2, null, sheet.fileId, false],
            ]
      expect(
        issue.occurrences
          .map((o) => [
            o.sourceType,
            o.rowNo,
            o.statusId,
            o.batchId?.toLowerCase() ?? null,
            o.fileId,
            o.defaultIncluded,
          ])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || Number(a[1]) - Number(b[1])),
        issue.transactionIdRaw ?? '',
      ).toEqual(expected.map((e) => [...e.slice(0, 3), (e[3] as string | null)?.toLowerCase() ?? null, ...e.slice(4)]))
      expect(issue.occurrences.every((o) => o.includeInSettlement === o.defaultIncluded)).toBe(true)
    }
  })

  it(`writes the findings in bulk: under ${WRITE_BUDGET_MS} ms for ${MISSING + DUPLICATES} findings`, () => {
    expect((phases.plainIssuesMs ?? 0) + (phases.occurrenceIssuesMs ?? 0)).toBeLessThan(WRITE_BUDGET_MS)
  })
})

describe('the bulk statements are chunked (review M2): 7 rows per statement', () => {
  const ROWS = 7
  const statements: { kind: string; rows: number }[] = []
  let runId: number

  beforeAll(async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    const sheet = await ctx.prisma.importSheet.findFirstOrThrow({
      where: { file: { importId } },
      select: { sheetId: true, fileId: true },
    })
    const txIds = (await ctx.prisma.transaction.findMany({ select: { transactionId: true }, take: 50 })).map(
      (t) => t.transactionId,
    )
    // 20 findings without occurrences (3 chunks) and 9 duplicates with 2 occurrences each: 2 MERGE chunks, 3 chunks
    // of occurrences, and the rows of each duplicate fall on different chunks than its finding's ordinal.
    const missing: Issue[] = Array.from({ length: 20 }, (_, n) => ({
      issueType: 'missing',
      scope: 'in_range',
      blocking: false,
      transactionIdRaw: `cm-${n}`,
      transactionId: txIds[n] as bigint,
      cycle: 'E',
      statusId: 2,
      missingType: 'in_range',
      missingRange: 'APP',
      relevantDate: new Date(Date.UTC(2026, 9, 1, 0, n)),
      occurrences: [],
    }))
    const row = (rowNo: number, defaultIncluded: boolean): Occurrence => ({
      sourceType: 'current_import',
      fileId: sheet.fileId,
      sheetId: sheet.sheetId,
      rowNo,
      statusId: 2,
      excludeAmount: false,
      defaultIncluded,
    })
    const duplicates: Issue[] = Array.from({ length: 9 }, (_, n) => ({
      issueType: 'duplicate',
      scope: 'in_batch',
      blocking: false,
      transactionIdRaw: `cd-${n}`,
      transactionId: txIds[20 + n] as bigint,
      cycle: 'E',
      statusId: 2,
      occurrences: [row(1_000 + 10 * n, true), row(1_001 + 10 * n, false)],
    }))
    const report: ValidationReport = {
      results: ValidationCode.options.map((code) => {
        const issues = code === 'missing_in_range' ? missing : code === 'duplicate_in_batch' ? duplicates : []
        return { code, outcome: issues.length > 0 ? 'warning' : 'passed', issueCount: issues.length, issues }
      }),
      blocked: false,
      ranges: { APP: null, DEC: null, I: null, R: null },
      pendingInRangeCount: 0,
      undatedAdjustmentCount: 0,
      undatedCandidateCount: 0,
    }
    const imported = await ctx.prisma.import.findUniqueOrThrow({ where: { importId } })
    const repo = new PrismaValidationRunRepository(ctx.prisma, {
      rowsPerStatement: ROWS,
      onBulkStatement: (kind, rows) => statements.push({ kind, rows }),
    })

    runId = (await repo.saveRun(importId, imported.updatedAt, flow.userIds.analyst, report, new Date())).runId
  })

  it('splits each bulk insert into statements of at most 7 rows', () => {
    const sizes = (kind: string) => statements.filter((s) => s.kind === kind).map((s) => s.rows)
    expect(sizes('issues')).toEqual([7, 7, 6])
    expect(sizes('merge')).toEqual([7, 2])
    expect(sizes('occurrences')).toEqual([7, 7, 4])
  })

  it('stores every finding and puts each occurrence on its own finding across chunks', async () => {
    expect(await ctx.prisma.validationIssue.count({ where: { result: { runId } } })).toBe(29)
    const duplicates = await ctx.prisma.validationIssue.findMany({
      where: { result: { runId }, issueType: 'duplicate' },
      select: { transactionIdRaw: true, occurrences: { select: { rowNo: true, defaultIncluded: true } } },
    })
    expect(duplicates).toHaveLength(9)
    for (const d of duplicates) {
      const n = Number(d.transactionIdRaw?.slice(3))
      expect(d.occurrences.map((o) => [o.rowNo, o.defaultIncluded]).sort(), d.transactionIdRaw ?? '').toEqual([
        [1_000 + 10 * n, true],
        [1_001 + 10 * n, false],
      ])
    }
  })
})
