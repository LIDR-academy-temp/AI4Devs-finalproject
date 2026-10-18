import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadValidationInput } from '../../src/modules/validation/application/load-validation-input.js'
import { runValidations } from '../../src/modules/validation/domain/run-validations.js'
import type {
  AccountScope,
  Issue,
  Occurrence,
  ValidationReport,
  ValidationRow,
} from '../../src/modules/validation/domain/types.js'
import { PrismaValidationSources } from '../../src/modules/validation/infrastructure/prisma-validation-sources.js'
import { row as builtRow } from '../../src/modules/validation/test-support/builders.js'
import { type SampleName, sampleInput } from '../../src/modules/validation/test-support/sample-input.js'
import { createTestApp } from './helpers.js'
import { ImportFlow, removeImportsFrom } from './import-flow.js'

// Prisma adapters of the five read ports (validation-runs design D2) against SQL Server. Fixtures use ids 9xxx outside
// the seed's ranges (channels 9101/9102, account ZZ-ProviderB-Alt, batches 9101–9104) and are created and removed by
// their describe; the samples are uploaded through the API and removed in afterAll.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string
let sources: PrismaValidationSources

const PROVIDER_B = 102
const CHANNEL_120 = 9101
const CHANNEL_INACTIVE = 9102
const ALT_ACCOUNT_ID = 'a0000000-0000-4000-8000-000000009101'
const ALT_ACCOUNT_NAME = 'ZZ-ProviderB-Alt'
const DAY_MS = 86_400_000
/** Max of the R range: milliseconds that a `datetime` (1/300 s) would round, so only datetime2 keeps the edge. */
const R_MAX = new Date('2026-04-09T10:20:30.125Z')
const EXACT_DATE = new Date(R_MAX.getTime() - 120 * DAY_MS)
const LATE_DATE = new Date(EXACT_DATE.getTime() + 1)

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-validation-sources-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
  sources = new PrismaValidationSources(ctx.prisma)
  await removeFixtures()
})

afterAll(async () => {
  if (ctx) {
    await removeFixtures()
    await flow.close()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

// ───────────────────────── Fixtures ─────────────────────────

interface Fixture {
  mainAccountId: string
  historyImportId: string
  otherImportId: string
  undoneImportId: string
  unsettledImportId: string
  txn: Record<
    'exact' | 'late' | 'undated' | 'processed' | 'undone' | 'registered' | 'superseded' | 'resolved' | 'unsettled',
    bigint
  >
}

let fixture: Fixture

async function removeFixtures(): Promise<void> {
  const { prisma } = ctx
  const fixtureTxns = await prisma.transaction.findMany({
    where: { channelId: { in: [CHANNEL_120, CHANNEL_INACTIVE] } },
    select: { transactionId: true },
  })
  const ids = fixtureTxns.map((t) => t.transactionId)
  const imports = await prisma.import.findMany({
    where: {
      OR: [
        { accountId: ALT_ACCOUNT_ID },
        { batches: { some: { batchNo: { gte: 9101, lte: 9104 } } } },
        { runs: { some: { results: { some: { issues: { some: { transactionId: { in: ids } } } } } } } },
      ],
    },
    select: { importId: true },
  })
  await prisma.settlementTransaction.deleteMany({ where: { transactionId: { in: ids } } })
  await prisma.settlementBatch.deleteMany({ where: { batchNo: { gte: 9101, lte: 9104 } } })
  await removeImportsFrom(
    prisma,
    imports.map((i) => i.importId),
  )
  await prisma.transaction.deleteMany({ where: { transactionId: { in: ids } } })
  await prisma.accountChannel.deleteMany({ where: { channelId: { in: [CHANNEL_120, CHANNEL_INACTIVE] } } })
  await prisma.channel.deleteMany({ where: { channelId: { in: [CHANNEL_120, CHANNEL_INACTIVE] } } })
  await prisma.account.deleteMany({ where: { accountId: ALT_ACCOUNT_ID } })
}

async function createFixtures(): Promise<Fixture> {
  const { prisma } = ctx
  const analystId = flow.userIds.analyst
  const mainAccountId = flow.accountIds['ProviderB-Main'] as string
  await prisma.channel.createMany({
    data: [
      {
        channelId: CHANNEL_120,
        gatewayId: 1,
        providerId: PROVIDER_B,
        name: 'RAM-9101',
        settlementTermDays: 10,
        rollingReservePct: '0.05',
        rollingReserveDays: 120,
      },
      {
        channelId: CHANNEL_INACTIVE,
        gatewayId: 1,
        providerId: PROVIDER_B,
        name: 'RAM-9102',
        isActive: false,
        settlementTermDays: 10,
        rollingReservePct: '0.05',
        rollingReserveDays: 45,
      },
    ],
  })
  await prisma.accountChannel.create({
    data: { accountId: mainAccountId, channelId: CHANNEL_120, isPrimary: true, assignedAt: new Date() },
  })
  await prisma.account.create({
    data: {
      accountId: ALT_ACCOUNT_ID,
      providerId: PROVIDER_B,
      name: ALT_ACCOUNT_NAME,
      chargebackReservePolicy: 'hold_until_term',
      createdByUserId: analystId,
    },
  })

  const txn = async (suffix: number, status: number, transactionDate: Date, lastStatusChangedAt: Date | null = null) =>
    (
      await prisma.transaction.create({
        data: {
          sourceTransactionId: `91010000000${String(suffix).padStart(4, '0')}`,
          gatewayId: 1,
          merchantId: 1,
          providerId: PROVIDER_B,
          channelId: CHANNEL_120,
          amount: '100.0000',
          statusId: status,
          transactionDate,
          lastStatusChangedAt,
          appliedReservePct: '0.050000',
        },
      })
    ).transactionId
  const inApp = new Date('2026-10-01T12:00:00.000Z')
  const t: Fixture['txn'] = {
    exact: await txn(1, 2, EXACT_DATE),
    late: await txn(2, 2, LATE_DATE),
    undated: await txn(3, 4, inApp, null),
    processed: await txn(4, 2, inApp),
    undone: await txn(5, 2, inApp),
    registered: await txn(6, 3, inApp),
    superseded: await txn(7, 3, inApp),
    resolved: await txn(8, 3, inApp),
    unsettled: await txn(9, 3, inApp),
  }

  const newImport = async (accountId: string, status: string) => {
    const importId = randomUUID()
    await prisma.import.create({ data: { importId, accountId, createdByUserId: analystId, status } })
    return importId
  }
  const historyImportId = await newImport(mainAccountId, 'processed')
  const otherImportId = await newImport(ALT_ACCOUNT_ID, 'processed')
  const undoneImportId = await newImport(mainAccountId, 'analyzed')
  const unsettledImportId = await newImport(mainAccountId, 'analyzed')

  const batch = async (accountId: string, batchNo: number, importId: string, status: string) => {
    const batchId = randomUUID()
    await prisma.settlementBatch.create({
      data: {
        batchId,
        accountId,
        batchNo,
        importId,
        status,
        approvedByUserId: analystId,
        // CK_SettlementBatch_paidFields / _undoneFields: a paid or undone attempt records who and when.
        ...(status === 'paid' ? { paidAt: new Date(), paidByUserId: analystId } : {}),
        ...(status === 'undone' ? { undoneAt: new Date(), undoneByUserId: analystId } : {}),
      },
    })
    return batchId
  }
  const history = await batch(mainAccountId, 9101, historyImportId, 'processed')
  const other = await batch(ALT_ACCOUNT_ID, 9102, otherImportId, 'paid')
  const undone = await batch(mainAccountId, 9103, undoneImportId, 'undone')
  const movement = (
    batchId: string,
    transactionId: bigint,
    held: string,
    sheet: { sheetId: string; rowNo: number } | null = null,
  ) => ({
    batchId,
    transactionId,
    cycle: 'E',
    statusId: 2,
    settlementStatusId: 0,
    amount: '100.0000',
    eventDate: inApp,
    appliedReservePct: '0.050000',
    reserveDaysUsed: 120,
    reserveHeldAmt: held,
    sheetId: sheet?.sheetId ?? null,
    rowNo: sheet?.rowNo ?? null,
  })
  await prisma.settlementTransaction.createMany({
    data: [
      movement(history, t.exact, '5.0000'),
      movement(history, t.late, '5.0000'),
      movement(other, t.processed, '0.0000'),
      movement(undone, t.undone, '5.0000'),
    ],
  })

  // Registered missing findings: current run of an import with a processed batch (counts), superseded run, resolved
  // finding, and a current run of an import without any batch (none of the last three count).
  const missing = async (
    importId: string,
    transactionId: bigint,
    opts: { superseded?: boolean; resolved?: boolean } = {},
  ) => {
    const run = await prisma.validationRun.create({
      data: { importId, runByUserId: analystId, isSuperseded: opts.superseded ?? false },
    })
    const result = await prisma.validationResult.create({
      data: { runId: run.runId, validationCode: 'missing_in_range', outcome: 'warning', issueCount: 1 },
    })
    await prisma.validationIssue.create({
      data: {
        resultId: result.resultId,
        issueType: 'missing',
        scope: 'in_range',
        transactionId,
        cycle: 'E',
        statusId: 3,
        missingType: 'in_range',
        relevantDate: inApp,
        resolutionStatus: opts.resolved ? 'resolved' : 'persistent',
      },
    })
  }
  await missing(historyImportId, t.registered)
  await missing(historyImportId, t.superseded, { superseded: true })
  await missing(otherImportId, t.resolved, { resolved: true })
  await missing(unsettledImportId, t.unsettled)

  return { mainAccountId, historyImportId, otherImportId, undoneImportId, unsettledImportId, txn: t }
}

const scopeOf = async (): Promise<AccountScope> => {
  const detail = await ctx.prisma.import.findUniqueOrThrow({ where: { importId: fixture.unsettledImportId } })
  return sources.accountOf(detail.importId)
}

// ───────────────────────── Limits of the adapters ─────────────────────────

describe('adapters over fixtures with exact limits', () => {
  beforeAll(async () => {
    fixture = await createFixtures()
  })

  afterAll(async () => {
    await removeFixtures()
  })

  it('accountOf: primary channels of the account and the reserve days of every channel of the provider, inactive ones included', async () => {
    const account = await scopeOf()

    expect(account.accountId).toBe(fixture.mainAccountId)
    expect(account.providerId).toBe(PROVIDER_B)
    expect([...account.primaryChannelIds].sort()).toEqual([1011, 1012, CHANNEL_120])
    expect(account.reserveDaysByChannel.get(CHANNEL_120)).toBe(120)
    expect(account.reserveDaysByChannel.get(CHANNEL_INACTIVE)).toBe(45)
    expect(account.reserveDaysByChannel.get(1013)).toBe(120)
  })

  it('heldReserves: the reserve expiring exactly at rMax arrives, the one 1 ms later does not (datetime2 precision)', async () => {
    const account = await scopeOf()

    const held = await sources.heldReserves(account, R_MAX)
    const fixtureIds = held.filter((h) => h.channelId === CHANNEL_120).map((h) => h.transactionId)

    expect(fixtureIds).toEqual([fixture.txn.exact])
    expect(held.find((h) => h.transactionId === fixture.txn.exact)).toMatchObject({
      sourceTransactionId: '910100000000001',
      statusId: 2,
      transactionDate: EXACT_DATE,
      reserveHeldAmt: '5.0000',
      reserveEarlyReleasedAmt: '0.0000',
    })
  })

  it('heldReserves + engine: the exact reserve is a missing_in_range R finding with the same expiry', async () => {
    const account = await scopeOf()
    const reserveCandidates = (await sources.heldReserves(account, R_MAX)).filter((h) => h.channelId === CHANNEL_120)
    // One RR row of the channel whose expiry is R_MAX opens the R range up to exactly that instant.
    const rows: ValidationRow[] = [
      builtRow({ transactionId: 1n, cycle: 'R', status: 'Successful', channelId: CHANNEL_120, date: EXACT_DATE }),
    ]

    const report = runValidations({
      account,
      rows,
      history: [],
      hasPreviousBatches: true,
      candidates: [],
      reserveCandidates,
      registeredMissing: new Set(),
      statuses: await sources.statuses(),
    })

    expect(report.ranges.R?.max).toEqual(R_MAX)
    const missing = report.results.find((r) => r.code === 'missing_in_range')!
    expect(missing.issues.map((i) => [i.transactionId, i.cycle, i.relevantDate])).toEqual([
      [fixture.txn.exact, 'R', R_MAX],
    ])
  })

  it('candidates: an undated Chargeback arrives (counted, not classified), one processed in E on another account of the provider does not, an undone attempt does not count as processed', async () => {
    const account = await scopeOf()
    const range = { min: new Date('2026-09-28T00:00:00.000Z'), max: new Date('2026-10-07T23:59:59.000Z') }

    const candidates = await sources.candidates(account, { APP: range, DEC: null, I: range, R: null })
    const fixtureIds = new Set(candidates.filter((c) => c.channelId === CHANNEL_120).map((c) => c.transactionId))

    expect(fixtureIds.has(fixture.txn.undated)).toBe(true)
    expect(candidates.find((c) => c.transactionId === fixture.txn.undated)?.lastStatusChangedAt).toBeNull()
    expect(fixtureIds.has(fixture.txn.processed)).toBe(false)
    expect(fixtureIds.has(fixture.txn.undone)).toBe(true)
  })

  it('history: an undone attempt is left out, the attempts of the excluded import too, and sheet/row travel', async () => {
    const ids = [fixture.txn.exact, fixture.txn.processed, fixture.txn.undone]

    const all = await sources.movements(PROVIDER_B, ids, fixture.unsettledImportId)
    const withoutHistory = await sources.movements(PROVIDER_B, ids, fixture.historyImportId)

    expect(all.map((m) => m.transactionId).sort()).toEqual([fixture.txn.exact, fixture.txn.processed].sort())
    expect(all.find((m) => m.transactionId === fixture.txn.processed)).toMatchObject({
      accountId: ALT_ACCOUNT_ID,
      batchNo: 9102,
      attemptNo: 1,
      batchStatus: 'paid',
      cycle: 'E',
      statusId: 2,
      excludeAmount: false,
      sheetId: null,
      rowNo: null,
    })
    expect(withoutHistory.map((m) => m.transactionId)).toEqual([fixture.txn.processed])
    expect(await sources.hasPreviousBatches(PROVIDER_B, fixture.unsettledImportId)).toBe(true)
  })

  it('registered: only persistent missing findings of current runs of imports with a processed or paid batch', async () => {
    const registered = await sources.registered(PROVIDER_B)

    expect(registered.has(`E:${fixture.txn.registered}`)).toBe(true)
    expect(registered.has(`E:${fixture.txn.superseded}`)).toBe(false)
    expect(registered.has(`E:${fixture.txn.resolved}`)).toBe(false)
    expect(registered.has(`E:${fixture.txn.unsettled}`)).toBe(false)
  })
})

// ───────────────────────── The samples: database input equals the in-memory one ─────────────────────────

/** A report without the ids each side generates (sheets, files, batches, transactions), comparable across sides. */
function comparable(report: ValidationReport, sourceIdOf: (id: bigint | null) => string | null) {
  const occurrence = (o: Occurrence) =>
    o.sourceType === 'current_import'
      ? {
          sourceType: o.sourceType,
          rowNo: o.rowNo,
          statusId: o.statusId,
          excludeAmount: o.excludeAmount,
          defaultIncluded: o.defaultIncluded,
        }
      : {
          sourceType: o.sourceType,
          batchNo: o.batchNo,
          attemptNo: o.attemptNo,
          statusId: o.statusId,
          excludeAmount: o.excludeAmount,
          defaultIncluded: o.defaultIncluded,
        }
  const issue = (i: Issue) => ({
    issueType: i.issueType,
    scope: i.scope,
    blocking: i.blocking,
    transactionIdRaw: i.transactionIdRaw,
    sourceTransactionId: sourceIdOf(i.transactionId),
    cycle: i.cycle,
    statusId: i.statusId,
    missingType: i.missingType ?? null,
    missingRange: i.missingRange ?? null,
    relevantDate: i.relevantDate?.toISOString() ?? null,
    gatewayStatusId: i.gatewayStatusId ?? null,
    sourceRowNo: i.source?.rowNo ?? null,
    occurrences: i.occurrences.map(occurrence),
  })
  return {
    blocked: report.blocked,
    ranges: report.ranges,
    pendingInRangeCount: report.pendingInRangeCount,
    undatedAdjustmentCount: report.undatedAdjustmentCount,
    undatedCandidateCount: report.undatedCandidateCount,
    results: report.results.map((r) => ({
      code: r.code,
      outcome: r.outcome,
      issueCount: r.issueCount,
      issues: r.issues.map(issue),
    })),
  }
}

/** The fields of a row the engine compares, without the ids each side generates. */
const rowShape = (r: ValidationRow) => [
  r.fileOrder,
  r.sheetOrder,
  r.rowNo,
  r.transactionIdRaw,
  r.cycle,
  r.statusId,
  r.excludeAmount,
  r.matchResult,
  r.transaction?.channelId ?? null,
  r.transaction?.statusId ?? null,
  r.transaction?.transactionDate.toISOString() ?? null,
]

describe('the five samples: input built from the database equals the in-memory one', () => {
  const samples: SampleName[] = ['batch-clean', 'batch-split', 'batch-issues', 'batch-blocked', 'legacy-provider']

  it.each(samples)(
    '%s: rows (fileOrder, sheetOrder, excludeAmount) and the report of runValidations match',
    async (sample) => {
      const detail = await flow.analyzedSample(sample)
      const memory = await sampleInput(sample)

      const { input } = await loadValidationInput(sources, detail.importId)

      const byPosition = (a: unknown[], b: unknown[]) => JSON.stringify(a).localeCompare(JSON.stringify(b))
      expect(input.rows.map(rowShape).sort(byPosition)).toEqual(memory.input.rows.map(rowShape).sort(byPosition))

      const dbIds = new Map(
        (
          await ctx.prisma.transaction.findMany({
            where: {
              transactionId: {
                in: [
                  ...new Set(runValidations(input).results.flatMap((r) => r.issues.map((i) => i.transactionId))),
                ].filter((id): id is bigint => id !== null),
              },
            },
            select: { transactionId: true, sourceTransactionId: true },
          })
        ).map((t) => [t.transactionId, t.sourceTransactionId]),
      )
      const fromDb = comparable(runValidations(input), (id) => (id === null ? null : (dbIds.get(id) ?? `?${id}`)))
      const fromMemory = comparable(runValidations(memory.input), (id) =>
        id === null ? null : (memory.sources.transaction(id)?.sourceTransactionId ?? `?${id}`),
      )
      expect(fromDb).toEqual(fromMemory)
      await flow.removeImports([detail.importId])
    },
  )
})
