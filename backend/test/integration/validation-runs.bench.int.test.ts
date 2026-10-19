import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { ValidationRunView } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Prisma } from '../../src/generated/prisma/client.js'
import { benchInput } from '../../src/modules/validation/test-support/bench-input.js'
import { createTestApp } from './helpers.js'
import { ImportFlow } from './import-flow.js'

// Spec "Rendimiento de extremo a extremo" (validation-runs design D14): POST validations of a 2 000-row import against
// 50 000 previous movements, loading from SQL Server included, under 4 s (2 s locally, noted in the PR). Only with
// RECON_BENCH=1, never in CI, on a quiet machine (no `pnpm dev`). Without the variable nothing below runs, so no
// fixture is created. The volume is the engine's reference one (bench-input.ts), inserted set-based through OPENJSON
// on an isolated world: gateway, provider, channels and account 9301 (merchant 1), removed in afterAll.
const BENCH = process.env.RECON_BENCH === '1'
const GATEWAY = 9301
const PROVIDER = 9301
const CHANNEL_OF: Record<number, number> = { 1011: 9311, 1012: 9312 }
const ACCOUNT_ID = 'a0000000-0000-4000-8000-000000009301'
const ACCOUNT_NAME = 'ZZ-Bench'
const ROWS_PER_STATEMENT = 10_000
const SOURCE_BASE = 100_000_000_000_000n

type Db = Awaited<ReturnType<typeof createTestApp>>['prisma']

/**
 * Removes the bench world, idempotent, in FK order: what hangs from the bench imports (occurrences, findings, results,
 * runs, audit, rows, sheets, files), then the movements, the attempts, the imports and the transactions, and last the
 * catalog rows. Set-based joins, not `IN` lists: a run of the extreme case has ~23 000 findings.
 */
async function removeBenchWorld(prisma: Db): Promise<void> {
  const benchImports = Prisma.sql`SELECT [importId] FROM [Import] WHERE [accountId] = ${ACCOUNT_ID}`
  const benchRuns = Prisma.sql`SELECT [runId] FROM [ValidationRun] WHERE [importId] IN (${benchImports})`
  const benchIssues = Prisma.sql`SELECT i.[issueId] FROM [ValidationIssue] i
    JOIN [ValidationResult] r ON r.[resultId] = i.[resultId] WHERE r.[runId] IN (${benchRuns})`
  const benchSheets = Prisma.sql`SELECT s.[sheetId] FROM [ImportSheet] s
    JOIN [ImportFile] f ON f.[fileId] = s.[fileId] WHERE f.[importId] IN (${benchImports})`
  await prisma.$executeRaw`DELETE FROM [AuditLog] WHERE [entityType] = 'ConflictOccurrence' AND [entityId] IN (
    SELECT CONVERT(VARCHAR(64), o.[occurrenceId]) FROM [ConflictOccurrence] o WHERE o.[issueId] IN (${benchIssues}))`
  await prisma.$executeRaw`DELETE FROM [AuditLog] WHERE [entityType] = 'ValidationIssue' AND [entityId] IN (
    SELECT CONVERT(VARCHAR(64), x.[issueId]) FROM (${benchIssues}) x)`
  await prisma.$executeRaw`DELETE FROM [ConflictOccurrence] WHERE [issueId] IN (${benchIssues})`
  await prisma.$executeRaw`DELETE FROM [ValidationIssue] WHERE [issueId] IN (${benchIssues})`
  await prisma.$executeRaw`DELETE FROM [ValidationResult] WHERE [runId] IN (${benchRuns})`
  await prisma.$executeRaw`DELETE FROM [ValidationRun] WHERE [runId] IN (${benchRuns})`
  await prisma.$executeRaw`DELETE FROM [AuditLog] WHERE [entityType] = 'Import' AND [entityId] IN (
    SELECT LOWER(CONVERT(VARCHAR(36), x.[importId])) FROM (${benchImports}) x)`
  await prisma.$executeRaw`DELETE FROM [ImportRow] WHERE [sheetId] IN (${benchSheets})`
  await prisma.$executeRaw`DELETE FROM [ImportSheetColumnMap] WHERE [sheetId] IN (${benchSheets})`
  await prisma.$executeRaw`DELETE FROM [ImportSheet] WHERE [sheetId] IN (${benchSheets})`
  await prisma.$executeRaw`DELETE FROM [ImportFile] WHERE [importId] IN (${benchImports})`
  await prisma.$executeRaw`DELETE st FROM [SettlementTransaction] st
    JOIN [SettlementBatch] b ON b.[batchId] = st.[batchId] WHERE b.[accountId] = ${ACCOUNT_ID}`
  await prisma.$executeRaw`DELETE FROM [SettlementBatch] WHERE [accountId] = ${ACCOUNT_ID}`
  await prisma.$executeRaw`DELETE FROM [Import] WHERE [accountId] = ${ACCOUNT_ID}`
  await prisma.$executeRaw`DELETE FROM [Transaction] WHERE [providerId] = ${PROVIDER}`
  await prisma.accountChannel.deleteMany({ where: { accountId: ACCOUNT_ID } })
  await prisma.account.deleteMany({ where: { accountId: ACCOUNT_ID } })
  await prisma.channel.deleteMany({ where: { providerId: PROVIDER } })
  await prisma.provider.deleteMany({ where: { providerId: PROVIDER } })
  await prisma.gateway.deleteMany({ where: { gatewayId: GATEWAY } })
}

/** Read-only: what is left of any 9xxx fixture world (the bench's and the other suites'). Every count must be 0. */
async function leftovers9xxx(prisma: Db): Promise<Record<string, number>> {
  const [row] = await prisma.$queryRaw<Record<string, number | bigint>[]>`
    SELECT
      (SELECT COUNT(*) FROM [Gateway] WHERE [gatewayId] BETWEEN 9000 AND 9999) AS gateways,
      (SELECT COUNT(*) FROM [Provider] WHERE [providerId] BETWEEN 9000 AND 9999) AS providers,
      (SELECT COUNT(*) FROM [Channel] WHERE [channelId] BETWEEN 9000 AND 9999 OR [providerId] BETWEEN 9000 AND 9999) AS channels,
      (SELECT COUNT(*) FROM [Account] WHERE [providerId] BETWEEN 9000 AND 9999 OR [name] LIKE 'ZZ-%') AS accounts,
      (SELECT COUNT(*) FROM [Transaction] WHERE [providerId] BETWEEN 9000 AND 9999 OR [channelId] BETWEEN 9000 AND 9999) AS transactions,
      (SELECT COUNT(*) FROM [SettlementBatch] WHERE [batchNo] BETWEEN 9000 AND 9999 OR [accountId] = ${ACCOUNT_ID}) AS batches,
      (SELECT COUNT(*) FROM [Import] WHERE [accountId] = ${ACCOUNT_ID}) AS benchImports`
  return Object.fromEntries(Object.entries(row ?? {}).map(([k, v]) => [k, Number(v)]))
}

describe.skipIf(!BENCH)('bench world cleanup (RECON_BENCH=1)', () => {
  it('removes the bench world and leaves nothing of the 9xxx fixtures', async () => {
    const ctx = await createTestApp()
    try {
      await removeBenchWorld(ctx.prisma)
      const left = await leftovers9xxx(ctx.prisma)
      expect(left).toEqual(Object.fromEntries(Object.keys(left).map((k) => [k, 0])))
    } finally {
      await ctx.app.close()
      await ctx.prisma.$disconnect()
    }
  }, 600_000)
})

describe.skipIf(!BENCH)('POST validations at the reference volume (RECON_BENCH=1)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>
  let flow: ImportFlow
  let importId: string

  const cleanup = () => removeBenchWorld(ctx.prisma)

  /** One INSERT … SELECT FROM OPENJSON per chunk: a single parameter, whatever the number of rows. */
  async function insertChunks<T>(items: T[], insert: (json: string) => Promise<unknown>): Promise<void> {
    for (let offset = 0; offset < items.length; offset += ROWS_PER_STATEMENT)
      await insert(JSON.stringify(items.slice(offset, offset + ROWS_PER_STATEMENT)))
  }

  beforeAll(async () => {
    ctx = await createTestApp()
    flow = new ImportFlow(ctx)
    await flow.init()
    await cleanup()
    const { prisma } = ctx
    const { input } = benchInput()
    const analyst = flow.userIds.analyst

    await prisma.gateway.create({ data: { gatewayId: GATEWAY, name: 'Gateway Bench', idFormat: 'numeric' } })
    await prisma.provider.create({ data: { providerId: PROVIDER, merchantId: 1, name: 'Provider Bench' } })
    for (const channelId of Object.values(CHANNEL_OF)) {
      await prisma.channel.create({
        data: {
          channelId,
          gatewayId: GATEWAY,
          providerId: PROVIDER,
          name: `RAM-${channelId}`,
          settlementTermDays: 10,
          rollingReservePct: '0.100000',
          rollingReserveDays: 180,
        },
      })
    }
    await prisma.account.create({
      data: {
        accountId: ACCOUNT_ID,
        providerId: PROVIDER,
        name: ACCOUNT_NAME,
        chargebackReservePolicy: 'release_on_chargeback',
        createdByUserId: analyst,
      },
    })
    await prisma.accountChannel.createMany({
      data: Object.values(CHANNEL_OF).map((channelId) => ({
        accountId: ACCOUNT_ID,
        channelId,
        isPrimary: true,
        assignedAt: new Date(),
      })),
    })

    // Transactions: every one the bench knows (rows, history, candidates, reserves), keyed by sourceTransactionId.
    const known = new Map<bigint, { channelId: number; statusId: number; d: Date; c: Date | null }>()
    for (const r of input.rows)
      if (r.transaction)
        known.set(r.transaction.transactionId, {
          channelId: r.transaction.channelId,
          statusId: r.transaction.statusId,
          d: r.transaction.transactionDate,
          c: r.transaction.lastStatusChangedAt,
        })
    for (const c of input.candidates)
      known.set(c.transactionId, {
        channelId: c.channelId,
        statusId: c.statusId,
        d: c.transactionDate,
        c: c.lastStatusChangedAt,
      })
    for (const r of input.reserveCandidates)
      if (!known.has(r.transactionId))
        known.set(r.transactionId, { channelId: r.channelId, statusId: r.statusId, d: r.transactionDate, c: null })
    for (const m of input.history)
      if (!known.has(m.transactionId))
        known.set(m.transactionId, { channelId: 1011, statusId: m.statusId, d: new Date('2026-01-01'), c: null })
    const txns = [...known.entries()].map(([id, t]) => ({
      s: String(SOURCE_BASE + id),
      ch: CHANNEL_OF[t.channelId],
      st: t.statusId,
      d: t.d.toISOString(),
      c: t.c?.toISOString() ?? null,
    }))
    await insertChunks(
      txns,
      (json) => prisma.$executeRaw`
        INSERT INTO [Transaction] ([sourceTransactionId], [gatewayId], [merchantId], [providerId], [channelId], [amount],
          [statusId], [transactionDate], [lastStatusChangedAt], [appliedReservePct])
        SELECT j.[s], ${GATEWAY}, 1, ${PROVIDER}, j.[ch], 100, j.[st], j.[d], j.[c], 0.1
        FROM OPENJSON(${json}) WITH ([s] VARCHAR(36), [ch] INT, [st] INT, [d] DATETIME2 '$.d', [c] DATETIME2 '$.c') j`,
    )

    // History: one processed import and attempt per batchNo (one current attempt per import), then the movements.
    const batchNos = [...new Set(input.history.map((m) => m.batchNo))]
    const batches = batchNos.map((batchNo) => ({ i: randomUUID(), b: randomUUID(), n: batchNo }))
    await insertChunks(
      batches,
      (json) => prisma.$executeRaw`
        INSERT INTO [Import] ([importId], [accountId], [createdByUserId], [status], [updatedAt])
        SELECT j.[i], ${ACCOUNT_ID}, ${analyst}, 'processed', SYSUTCDATETIME()
        FROM OPENJSON(${json}) WITH ([i] UNIQUEIDENTIFIER) j`,
    )
    await insertChunks(
      batches,
      (json) => prisma.$executeRaw`
        INSERT INTO [SettlementBatch] ([batchId], [accountId], [batchNo], [attemptNo], [importId], [status],
          [approvedByUserId], [updatedAt])
        SELECT j.[b], ${ACCOUNT_ID}, j.[n], 1, j.[i], 'processed', ${analyst}, SYSUTCDATETIME()
        FROM OPENJSON(${json}) WITH ([b] UNIQUEIDENTIFIER, [i] UNIQUEIDENTIFIER, [n] INT) j`,
    )
    const movements = input.history.map((m) => ({
      s: String(SOURCE_BASE + m.transactionId),
      n: m.batchNo,
      y: m.cycle,
      st: m.statusId,
      h: m.cycle === 'E' && m.statusId === 2 ? 10 : 0,
    }))
    await insertChunks(
      movements,
      (json) => prisma.$executeRaw`
        INSERT INTO [SettlementTransaction] ([batchId], [transactionId], [cycle], [statusId], [settlementStatusId],
          [amount], [eventDate], [appliedReservePct], [reserveDaysUsed], [reserveHeldAmt])
        SELECT b.[batchId], t.[transactionId], j.[y], j.[st], 0, 100, t.[transactionDate], 0.1, 180, j.[h]
        FROM OPENJSON(${json}) WITH ([s] VARCHAR(36), [n] INT, [y] CHAR(1), [st] INT, [h] DECIMAL(19, 4)) j
        JOIN [Transaction] t ON t.[gatewayId] = ${GATEWAY} AND t.[sourceTransactionId] = j.[s]
        JOIN [SettlementBatch] b ON b.[accountId] = ${ACCOUNT_ID} AND b.[batchNo] = j.[n]`,
    )

    // The import under test: analyzed, one file, the four sheets of the rows and the 2 000 rows matched.
    importId = randomUUID()
    const fileId = randomUUID()
    await prisma.import.create({
      data: { importId, accountId: ACCOUNT_ID, createdByUserId: analyst, status: 'analyzed', analyzedAt: new Date() },
    })
    await prisma.importFile.create({
      data: {
        fileId,
        importId,
        fileName: 'bench.xlsx',
        storagePath: 'bench/none.xlsx',
        sizeBytes: 1,
        sha256: '0'.repeat(64),
      },
    })
    const sheetIds = new Map<string, string>()
    for (const [index, name] of ['APP', 'DEC', 'CHB', 'RR'].entries()) {
      const sheetId = randomUUID()
      sheetIds.set(`bench-${name}`, sheetId)
      await prisma.importSheet.create({
        data: {
          sheetId,
          fileId,
          sheetName: name,
          kind: 'transactions',
          cycle: name === 'CHB' ? 'I' : name === 'RR' ? 'R' : 'E',
          statusId: name === 'APP' ? 2 : name === 'DEC' ? 3 : name === 'CHB' ? 4 : null,
          mappingConfirmed: true,
          sheetIndex: index,
        },
      })
    }
    const rows = input.rows.map((r) => ({
      sh: sheetIds.get(r.sheetId),
      r: r.rowNo,
      raw: r.transactionIdRaw,
      st: r.statusId,
      y: r.cycle,
      x: r.excludeAmount ? JSON.stringify({ excludeAmount: true }) : null,
    }))
    await insertChunks(
      rows,
      (json) => prisma.$executeRaw`
        INSERT INTO [ImportRow] ([sheetId], [rowNo], [transactionIdRaw], [transactionId], [gatewayId], [statusId],
          [cycle], [rawData], [matchResult], [detailJson])
        SELECT j.[sh], j.[r], j.[raw], t.[transactionId], ${GATEWAY}, j.[st], j.[y], '{}', 'matched', j.[x]
        FROM OPENJSON(${json}) WITH ([sh] UNIQUEIDENTIFIER, [r] INT, [raw] NVARCHAR(100), [st] INT, [y] CHAR(1),
          [x] NVARCHAR(MAX)) j
        JOIN [Transaction] t ON t.[gatewayId] = ${GATEWAY} AND t.[sourceTransactionId] = j.[raw]`,
    )
    expect(await prisma.importRow.count({ where: { sheet: { fileId } } })).toBe(input.rows.length)
    expect(await prisma.settlementTransaction.count({ where: { batch: { accountId: ACCOUNT_ID } } })).toBe(
      input.history.length,
    )
  }, 600_000)

  afterAll(async () => {
    if (ctx) {
      await cleanup()
      await ctx.app.close()
      await ctx.prisma.$disconnect()
    }
  }, 600_000)

  it('answers 201 in under 4 s, with load, engine and write timed apart', async () => {
    const started = performance.now()
    const res = await flow.call('POST', `/imports/${importId}/validations`)
    const ms = performance.now() - started

    expect(res.statusCode, res.body).toBe(201)
    const view = ValidationRunView.parse(res.json())
    const timing = ctx.logLines.map((l) => JSON.parse(l)).find((l) => l.msg === 'validation run stored')
    console.info(
      `[bench] POST validations: ${ms.toFixed(0)} ms (load ${timing?.loadMs} ms, engine ${timing?.engineMs} ms, ` +
        `write ${timing?.writeMs} ms); ${view.run?.results.reduce((n, r) => n + r.issueCount, 0)} findings`,
    )
    expect(ms).toBeLessThan(4_000)
  }, 60_000)
})
