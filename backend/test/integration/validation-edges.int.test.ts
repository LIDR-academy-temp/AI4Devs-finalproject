import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ValidationIssueDetail, ValidationIssuesPage, ValidationRunView } from '@recon/shared'
import argon2 from 'argon2'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Prisma } from '../../src/generated/prisma/client.js'
import { PrismaImportRepository } from '../../src/modules/imports/infrastructure/prisma-import-repository.js'
import { buildXlsx } from '../../src/modules/imports/infrastructure/xlsx/test-support.js'
import { createTestApp, fixtureId, fixtureIds } from './helpers.js'
import { ImportFlow } from './import-flow.js'

// Edges of validation-runs against SQL Server (verify W4–W6): a historical occurrence with its sheet and row, the
// informative counters end to end, and the scope of every validation route with an import of another merchant.
// Fixtures use ids 9xxx outside the seed's ranges and are removed before and after their describe.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-validation-edges-int-'))
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

const xlsx = (sheet: string, ids: string[]) =>
  buildXlsx({
    sheets: [{ name: sheet, rows: [['ID', 'Amount', 'Currency'], ...ids.map((id) => [id, { v: '10' }, 'USD'])] }],
  })

async function run(importId: string) {
  const res = await flow.call('POST', `/imports/${importId}/validations`)
  expect(res.statusCode, res.body).toBe(201)
  return ValidationRunView.parse(res.json())
}

// ───────────────────────── W4: historical occurrence with sheet and row ─────────────────────────

describe('a previous_batch occurrence whose movement has a sheet and a row (spec "Movimiento histórico con fila")', () => {
  const BATCH_NO = 9401
  let accountId: string
  let sourceId: string
  let previousImportId: string
  let previousSheet: { sheetId: string; fileId: string; fileName: string }

  async function removeFixture(): Promise<void> {
    const { prisma } = ctx
    const batches = await prisma.settlementBatch.findMany({
      where: {
        batchNo: fixtureId(BATCH_NO, 'BATCH_NO'),
        accountId: fixtureId(flow.accountIds['ProviderB-Main'], 'ProviderB-Main'),
      },
      select: { batchId: true, importId: true },
    })
    const batchIds = fixtureIds(
      batches.map((b) => b.batchId),
      'batchIds',
    )
    // Imports whose findings point at the fixture batch go first (their occurrences reference it).
    const dependent = await prisma.import.findMany({
      where: {
        runs: {
          some: { results: { some: { issues: { some: { occurrences: { some: { batchId: { in: batchIds } } } } } } } },
        },
      },
      select: { importId: true },
    })
    await flow.removeImports(dependent.map((i) => i.importId))
    await prisma.settlementTransaction.deleteMany({ where: { batchId: { in: batchIds } } })
    await prisma.settlementBatch.deleteMany({ where: { batchId: { in: batchIds } } })
    await flow.removeImports(batches.map((b) => b.importId))
  }

  beforeAll(async () => {
    await removeFixture()
    const { prisma } = ctx
    accountId = flow.accountIds['ProviderB-Main'] as string
    // A Successful transaction of a primary channel never settled in E: its only history is the fixture batch.
    const [found] = await prisma.$queryRaw<{ sourceTransactionId: string; transactionId: bigint }[]>`
      SELECT TOP 1 t.[sourceTransactionId], t.[transactionId] FROM [Transaction] t
      WHERE t.[providerId] = 102 AND t.[channelId] = 1011 AND t.[statusId] = 2
        AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st WHERE st.[transactionId] = t.[transactionId])
      ORDER BY t.[transactionId]`
    sourceId = found!.sourceTransactionId
    // The previous import: analyzed with the transaction in APP, then settled in batch 9401 from that sheet and row.
    const previous = await flow.analyzed(accountId, [{ name: 'previous-9401.xlsx', bytes: xlsx('APP', [sourceId]) }])
    previousImportId = previous.importId
    const sheet = await prisma.importSheet.findFirstOrThrow({
      where: { file: { importId: previousImportId }, sheetName: 'APP' },
      select: { sheetId: true, fileId: true, file: { select: { fileName: true } } },
    })
    previousSheet = { sheetId: sheet.sheetId, fileId: sheet.fileId, fileName: sheet.file.fileName }
    await prisma.import.update({ where: { importId: previousImportId }, data: { status: 'processed' } })
    const batchId = randomUUID()
    await prisma.settlementBatch.create({
      data: {
        batchId,
        accountId,
        batchNo: BATCH_NO,
        importId: previousImportId,
        status: 'processed',
        approvedByUserId: flow.userIds.analyst,
      },
    })
    await prisma.settlementTransaction.create({
      data: {
        batchId,
        transactionId: found!.transactionId,
        cycle: 'E',
        statusId: 2,
        settlementStatusId: 0,
        sheetId: sheet.sheetId,
        rowNo: 2,
        amount: '10.0000',
        eventDate: new Date('2026-10-01T00:00:00.000Z'),
        appliedReservePct: '0.100000',
        reserveDaysUsed: 180,
      },
    })
  })

  afterAll(async () => {
    await removeFixture()
  })

  it('is stored with the file of its sheet, and GET validation-issues/{id} answers its full location', async () => {
    const current = await flow.analyzed(accountId, [{ name: 'current-9401.xlsx', bytes: xlsx('APP', [sourceId]) }])
    await run(current.importId)
    const page = ValidationIssuesPage.parse(
      (
        await flow.call('GET', `/imports/${current.importId}/validation-issues?type=duplicate&scope=across_batches`)
      ).json(),
    )
    const issue = page.items.find((i) => i.transactionIdRaw === sourceId)!

    const stored = await ctx.prisma.conflictOccurrence.findFirstOrThrow({
      where: { issueId: issue.issueId, sourceType: 'previous_batch' },
    })
    expect(stored).toMatchObject({ sheetId: previousSheet.sheetId, rowNo: 2, fileId: previousSheet.fileId })

    const res = await flow.call('GET', `/validation-issues/${issue.issueId}`)
    expect(res.statusCode).toBe(200)
    const historical = ValidationIssueDetail.parse(res.json()).occurrences.find(
      (o) => o.sourceType === 'previous_batch',
    )!
    expect(historical.location).toEqual({
      fileId: previousSheet.fileId,
      fileName: previousSheet.fileName,
      sheetId: previousSheet.sheetId,
      sheetName: 'APP',
      rowNo: 2,
    })
    expect(historical.batch).toMatchObject({
      batchNo: BATCH_NO,
      attemptNo: 1,
      status: 'processed',
      accountName: 'ProviderB-Main',
    })
  })
})

// ──────────── settlement-process D3: two historical movements of the same key in one batch ────────────

describe('two historical movements of the same transaction and cycle in a batch (spec "Dos movimientos históricos de la misma clave en un batch")', () => {
  const BATCH_NO = 9402
  let accountId: string
  let sourceId: string
  let chbSheetId: string

  async function removeFixture(): Promise<void> {
    const { prisma } = ctx
    const batches = await prisma.settlementBatch.findMany({
      where: {
        batchNo: fixtureId(BATCH_NO, 'BATCH_NO'),
        accountId: fixtureId(flow.accountIds['ProviderB-Main'], 'ProviderB-Main'),
      },
      select: { batchId: true, importId: true },
    })
    const batchIds = fixtureIds(
      batches.map((b) => b.batchId),
      'batchIds',
    )
    const dependent = await prisma.import.findMany({
      where: {
        runs: {
          some: { results: { some: { issues: { some: { occurrences: { some: { batchId: { in: batchIds } } } } } } } },
        },
      },
      select: { importId: true },
    })
    await flow.removeImports(dependent.map((i) => i.importId))
    await prisma.settlementTransaction.deleteMany({ where: { batchId: { in: batchIds } } })
    await prisma.settlementBatch.deleteMany({ where: { batchId: { in: batchIds } } })
    await flow.removeImports(batches.map((b) => b.importId))
  }

  beforeAll(async () => {
    await removeFixture()
    const { prisma } = ctx
    accountId = flow.accountIds['ProviderB-Main'] as string
    // A chargeback of a primary channel never settled in I: its only I history is the fixture batch.
    const [found] = await prisma.$queryRaw<{ sourceTransactionId: string; transactionId: bigint }[]>`
      SELECT TOP 1 t.[sourceTransactionId], t.[transactionId] FROM [Transaction] t
      WHERE t.[providerId] = 102 AND t.[channelId] = 1011 AND t.[statusId] = 4
        AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st
                        WHERE st.[transactionId] = t.[transactionId] AND st.[cycle] = 'I')
      ORDER BY t.[transactionId]`
    sourceId = found!.sourceTransactionId
    // The previous import has the chargeback twice in CHB (rows 2 and 3); batch 9402 settled both, the second as CHB 2.
    const previous = await flow.analyzed(accountId, [
      { name: 'previous-9402.xlsx', bytes: xlsx('CHB', [sourceId, sourceId]) },
    ])
    const sheet = await prisma.importSheet.findFirstOrThrow({
      where: { file: { importId: previous.importId }, sheetName: 'CHB' },
      select: { sheetId: true },
    })
    chbSheetId = sheet.sheetId
    await prisma.import.update({ where: { importId: previous.importId }, data: { status: 'processed' } })
    const batchId = randomUUID()
    await prisma.settlementBatch.create({
      data: {
        batchId,
        accountId,
        batchNo: BATCH_NO,
        importId: previous.importId,
        status: 'processed',
        approvedByUserId: flow.userIds.analyst,
      },
    })
    for (const [rowNo, excludeAmount] of [
      [2, false],
      [3, true],
    ] as const) {
      await prisma.settlementTransaction.create({
        data: {
          batchId,
          transactionId: found!.transactionId,
          cycle: 'I',
          statusId: 4,
          settlementStatusId: 0,
          sheetId: chbSheetId,
          rowNo,
          amount: '10.0000',
          excludeAmount,
          eventDate: new Date('2026-10-01T00:00:00.000Z'),
          appliedReservePct: '0.100000',
          reserveDaysUsed: 180,
        },
      })
    }
  })

  afterAll(async () => {
    await removeFixture()
  })

  it('shows each historical occurrence with its own row and excludeAmount', async () => {
    const current = await flow.analyzed(accountId, [{ name: 'current-9402.xlsx', bytes: xlsx('REF', [sourceId]) }])
    await run(current.importId)
    const page = ValidationIssuesPage.parse(
      (
        await flow.call('GET', `/imports/${current.importId}/validation-issues?type=collision&scope=across_batches`)
      ).json(),
    )
    const issue = page.items.find((i) => i.transactionIdRaw === sourceId)!

    const res = await flow.call('GET', `/validation-issues/${issue.issueId}`)
    expect(res.statusCode).toBe(200)
    const historical = ValidationIssueDetail.parse(res.json())
      .occurrences.filter((o) => o.sourceType === 'previous_batch')
      .map((o) => ({ rowNo: o.location?.rowNo, excludeAmount: o.excludeAmount }))
    expect(historical).toEqual([
      { rowNo: 2, excludeAmount: false },
      { rowNo: 3, excludeAmount: true },
    ])
  })
})

// ───────────────────────── W5: informative counters end to end ─────────────────────────

describe('the informative counters from the engine to GET validations (spec "Contadores informativos")', () => {
  const PROVIDER = 9501
  const CHANNEL = 9501
  const ACCOUNT_ID = 'a0000000-0000-4000-8000-000000009501'
  const ids = { dated: '950100000000001', undatedRow: '950100000000002', undatedCandidate: '950100000000003' }

  async function removeFixture(): Promise<void> {
    const { prisma } = ctx
    const imports = await prisma.import.findMany({ where: { accountId: ACCOUNT_ID }, select: { importId: true } })
    await flow.removeImports(imports.map((i) => i.importId))
    await prisma.transaction.deleteMany({ where: { channelId: CHANNEL } })
    await prisma.accountChannel.deleteMany({ where: { channelId: CHANNEL } })
    await prisma.account.deleteMany({ where: { accountId: ACCOUNT_ID } })
    await prisma.channel.deleteMany({ where: { channelId: CHANNEL } })
    await prisma.provider.deleteMany({ where: { providerId: PROVIDER } })
  }

  beforeAll(async () => {
    await removeFixture()
    const { prisma } = ctx
    // An isolated provider: no seeded transaction of its channels can add to the counters.
    await prisma.provider.create({ data: { providerId: PROVIDER, merchantId: 1, name: 'Provider 9501' } })
    await prisma.channel.create({
      data: {
        channelId: CHANNEL,
        gatewayId: 1,
        providerId: PROVIDER,
        name: 'RAM-9501',
        settlementTermDays: 10,
        rollingReservePct: '0.100000',
        rollingReserveDays: 180,
      },
    })
    await prisma.account.create({
      data: {
        accountId: ACCOUNT_ID,
        providerId: PROVIDER,
        name: 'ZZ-Undated',
        chargebackReservePolicy: 'hold_until_term',
        createdByUserId: flow.userIds.analyst,
      },
    })
    await prisma.accountChannel.create({
      data: { accountId: ACCOUNT_ID, channelId: CHANNEL, isPrimary: true, assignedAt: new Date() },
    })
    const txn = (sourceTransactionId: string, statusId: number, lastStatusChangedAt: Date | null) => ({
      sourceTransactionId,
      gatewayId: 1,
      merchantId: 1,
      providerId: PROVIDER,
      channelId: CHANNEL,
      amount: '10.0000',
      statusId,
      transactionDate: new Date('2026-09-01T00:00:00.000Z'),
      lastStatusChangedAt,
      appliedReservePct: '0.100000',
    })
    await prisma.transaction.createMany({
      data: [
        // A dated Chargeback reported as Chargeback opens the I range.
        txn(ids.dated, 4, new Date('2026-10-01T10:00:00.000Z')),
        // A Chargeback without a change date reported in CHB: an undated adjustment row.
        txn(ids.undatedRow, 4, null),
        // A Refund without a change date that the file does not bring: an undated I candidate.
        txn(ids.undatedCandidate, 5, null),
      ],
    })
  })

  afterAll(async () => {
    await removeFixture()
  })

  it('stores undatedAdjustmentCount = 1 and undatedCandidateCount = 1 and GET validations answers them', async () => {
    const detail = await flow.analyzed(ACCOUNT_ID, [
      { name: 'undated-9501.xlsx', bytes: xlsx('CHB', [ids.dated, ids.undatedRow]) },
    ])

    const posted = await run(detail.importId)
    const res = await flow.call('GET', `/imports/${detail.importId}/validations`)

    expect(posted.run).toMatchObject({ undatedAdjustmentCount: 1, undatedCandidateCount: 1 })
    expect(res.statusCode).toBe(200)
    expect(ValidationRunView.parse(res.json()).run).toMatchObject({
      undatedAdjustmentCount: 1,
      undatedCandidateCount: 1,
    })
    const stored = await ctx.prisma.validationRun.findUniqueOrThrow({ where: { runId: posted.run!.runId } })
    expect([stored.undatedAdjustmentCount, stored.undatedCandidateCount]).toEqual([1, 1])
    // The undated candidate is counted, not classified: no missing finding for it.
    const missing = ValidationIssuesPage.parse(
      (await flow.call('GET', `/imports/${detail.importId}/validation-issues?type=missing`)).json(),
    )
    expect(missing.items.map((i) => i.transactionIdRaw)).not.toContain(ids.undatedCandidate)
  })
})

// ───────────────────────── Review L4: Import.updatedAt keeps datetime2 precision ─────────────────────────

describe('every writer of Import.updatedAt keeps datetime2 precision (review L4)', () => {
  const created: string[] = []

  afterAll(async () => {
    await flow.removeImports(created)
  })

  it('cancel stores updatedAt as the current UTC instant to the exact millisecond (the optimistic version compares it)', async () => {
    const { prisma } = ctx
    const repo = new PrismaImportRepository(prisma)
    for (let n = 0; n < 6; n++) {
      const importId = randomUUID()
      created.push(importId)
      await prisma.import.create({
        data: {
          importId,
          accountId: flow.accountIds['ProviderA-USD'] as string,
          createdByUserId: flow.userIds.analyst,
          status: 'uploaded',
        },
      })
      await repo.cancel(importId)
    }

    // A value rounded to datetime (1/300 s) lands on .xx0, .xx3 or .xx7 ms: only one in three is a whole millisecond.
    const rows = await prisma.$queryRaw<{ importId: string; ns: number }[]>`
      SELECT LOWER(CONVERT(VARCHAR(36), [importId])) AS importId, DATEPART(nanosecond, [updatedAt]) % 1000000 AS ns
      FROM [Import] WHERE [importId] IN (${Prisma.join(created)})`
    expect(rows.map((r) => Number(r.ns))).toEqual(created.map(() => 0))
    const stored = await prisma.import.findMany({ where: { importId: { in: created } }, select: { updatedAt: true } })
    for (const s of stored) expect(Math.abs(s.updatedAt.getTime() - Date.now())).toBeLessThan(60_000)
  })
})

// ───────────────────────── Review L2: file order in the detail ─────────────────────────

describe('the detail orders the files as the engine does: (uploadedAt, fileName, fileId) (review L2)', () => {
  it('a collision spread over two files uploaded at the same instant lists the file first by name first', async () => {
    const [found] = await ctx.prisma.$queryRaw<{ sourceTransactionId: string }[]>`
      SELECT TOP 1 t.[sourceTransactionId] FROM [Transaction] t
      WHERE t.[providerId] = 102 AND t.[channelId] = 1011 AND t.[statusId] = 2
        AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st WHERE st.[transactionId] = t.[transactionId])
      ORDER BY t.[transactionId] DESC`
    const id = found!.sourceTransactionId
    // In a-dec.xlsx the row is the second one (row 3); in b-app.xlsx the first one (row 2): only the file name can
    // put a-dec first, as the engine does.
    const decBytes = buildXlsx({
      sheets: [
        {
          name: 'DEC',
          rows: [
            ['ID', 'Amount', 'Currency'],
            ['', { v: '10' }, 'USD'],
            [id, { v: '10' }, 'USD'],
          ],
        },
      ],
    })
    const detail = await flow.analyzed(flow.accountIds['ProviderB-Main'] as string, [
      { name: 'b-app.xlsx', bytes: xlsx('APP', [id]) },
      { name: 'a-dec.xlsx', bytes: decBytes },
    ])
    await ctx.prisma.importFile.updateMany({
      where: { importId: detail.importId },
      data: { uploadedAt: new Date('2026-10-18T10:00:00.000Z') },
    })
    await run(detail.importId)
    const page = ValidationIssuesPage.parse(
      (await flow.call('GET', `/imports/${detail.importId}/validation-issues?type=collision&scope=in_batch`)).json(),
    )
    const collision = page.items.find((i) => i.transactionIdRaw === id)!

    const res = await flow.call('GET', `/validation-issues/${collision.issueId}`)

    const current = ValidationIssueDetail.parse(res.json()).occurrences.filter((o) => o.sourceType === 'current_import')
    expect(current.map((o) => [o.location?.fileName, o.location?.sheetName, o.location?.rowNo])).toEqual([
      ['a-dec.xlsx', 'DEC', 3],
      ['b-app.xlsx', 'APP', 2],
    ])
  })
})

// ───────────────────────── W6: scope of every route with an import of another merchant ─────────────────────────

describe('scope: an import of ProviderC-Alt (merchant 2) read and written by users of merchant 1 only', () => {
  const SCOPED_USER = 'zz-scoped-analyst'
  const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
  let importId: string
  let issueId: number
  let occurrenceId: string
  let scopedToken: string

  async function removeScopedUser(): Promise<void> {
    const { prisma } = ctx
    const user = await prisma.user.findUnique({ where: { userName: SCOPED_USER }, select: { userId: true } })
    if (!user) return
    await prisma.auditLog.deleteMany({ where: { userId: user.userId } })
    await prisma.refreshToken.deleteMany({ where: { userId: user.userId } })
    await prisma.userMerchant.deleteMany({ where: { userId: user.userId } })
    await prisma.user.delete({ where: { userId: user.userId } })
  }

  beforeAll(async () => {
    await removeScopedUser()
    const { prisma } = ctx
    // Two APP rows of the same ProviderC-Alt transaction: a duplicate with occurrences, in a merchant-2 import.
    const [found] = await prisma.$queryRaw<{ sourceTransactionId: string }[]>`
      SELECT TOP 1 [sourceTransactionId] FROM [Transaction] WHERE [channelId] = 2002 AND [statusId] = 2
      ORDER BY [transactionId]`
    const detail = await flow.analyzed(flow.accountIds['ProviderC-Alt'] as string, [
      { name: 'scope-c-alt.xlsx', bytes: xlsx('APP', [found!.sourceTransactionId, found!.sourceTransactionId]) },
    ])
    importId = detail.importId
    await run(importId)
    const page = ValidationIssuesPage.parse(
      (await flow.call('GET', `/imports/${importId}/validation-issues?type=duplicate&scope=in_batch`)).json(),
    )
    issueId = page.items[0]!.issueId
    const issue = ValidationIssueDetail.parse((await flow.call('GET', `/validation-issues/${issueId}`)).json())
    occurrenceId = issue.occurrences[0]!.occurrenceId

    // A user who may process but only sees merchant 1; its password is random and lives only in this test.
    const password = randomBytes(18).toString('base64url')
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'analyst' } })
    await prisma.user.create({
      data: {
        userName: SCOPED_USER,
        email: 'zz-scoped-analyst@recon.local',
        displayName: 'Scoped analyst',
        passwordHash: await argon2.hash(password),
        roleId: role.roleId,
        merchantScope: 'assigned',
        merchants: { create: [{ merchantId: 1 }] },
      },
    })
    const login = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName: SCOPED_USER, password },
    })
    expect(login.statusCode).toBe(200)
    scopedToken = login.json().accessToken
  })

  afterAll(async () => {
    await removeScopedUser()
  })

  const as = (token: string, method: 'GET' | 'PATCH', url: string, body?: object) =>
    ctx.app.inject({
      method,
      url: `/api/v1${url}`,
      headers: { authorization: `Bearer ${token}` },
      ...(body === undefined ? {} : { payload: body }),
    })

  it('viewer: the three reads answer 404 with the same body as an unknown resource', async () => {
    const viewer = flow.tokens.viewer
    const pairs = [
      [`/imports/${importId}/validations`, `/imports/${UNKNOWN_UUID}/validations`],
      [`/imports/${importId}/validation-issues`, `/imports/${UNKNOWN_UUID}/validation-issues`],
      [`/validation-issues/${issueId}`, '/validation-issues/2147483000'],
    ]
    for (const [foreign, unknown] of pairs) {
      const a = await as(viewer, 'GET', foreign as string)
      const b = await as(viewer, 'GET', unknown as string)
      expect(a.statusCode, foreign).toBe(404)
      expect(a.json(), foreign).toEqual(b.json())
    }
  })

  it('viewer: the two writes answer 403 before any scope check, so nothing about the resource leaks', async () => {
    const viewer = flow.tokens.viewer
    const resolve = await as(viewer, 'PATCH', `/validation-issues/${issueId}`, {
      resolutionStatus: 'resolved',
      note: 'x',
    })
    const include = await as(viewer, 'PATCH', `/conflict-occurrences/${occurrenceId}`, { includeInSettlement: false })

    expect([resolve.statusCode, include.statusCode]).toEqual([403, 403])
    expect(resolve.json().code).toBe('forbidden')
  })

  it('a user who may process merchant 1 only: the two writes answer 404 with the same body as an unknown resource', async () => {
    const pairs: [string, string, object][] = [
      [`/validation-issues/${issueId}`, '/validation-issues/2147483000', { resolutionStatus: 'resolved', note: 'x' }],
      [`/conflict-occurrences/${occurrenceId}`, '/conflict-occurrences/999999999999', { includeInSettlement: false }],
    ]
    for (const [foreign, unknown, body] of pairs) {
      const a = await as(scopedToken, 'PATCH', foreign, body)
      const b = await as(scopedToken, 'PATCH', unknown, body)
      expect(a.statusCode, foreign).toBe(404)
      expect(a.json(), foreign).toEqual(b.json())
    }
    // And nothing changed: the occurrence keeps its default, the finding stays persistent.
    const after = await ctx.prisma.conflictOccurrence.findUniqueOrThrow({
      where: { occurrenceId: BigInt(occurrenceId) },
    })
    expect(after.changedByUserId).toBeNull()
  })

  it('the same user: POST validations and POST review on the merchant-2 import answer 404 like an unknown one, and nothing changes', async () => {
    const runsBefore = await ctx.prisma.validationRun.findMany({
      where: { importId },
      select: { runId: true, isSuperseded: true },
      orderBy: { runId: 'asc' },
    })
    const statusBefore = (await ctx.prisma.import.findUniqueOrThrow({ where: { importId } })).status
    const post = (url: string, body?: object) =>
      ctx.app.inject({
        method: 'POST',
        url: `/api/v1${url}`,
        headers: { authorization: `Bearer ${scopedToken}` },
        ...(body === undefined ? {} : { payload: body }),
      })
    const currentRunId = runsBefore.find((r) => !r.isSuperseded)?.runId ?? 1

    const pairs: [string, string, object | undefined][] = [
      [`/imports/${importId}/validations`, `/imports/${UNKNOWN_UUID}/validations`, undefined],
      [`/imports/${importId}/review`, `/imports/${UNKNOWN_UUID}/review`, { runId: currentRunId }],
    ]
    for (const [foreign, unknown, body] of pairs) {
      const a = await post(foreign, body)
      const b = await post(unknown, body)
      expect(a.statusCode, foreign).toBe(404)
      expect(a.json(), foreign).toEqual(b.json())
    }
    expect(
      await ctx.prisma.validationRun.findMany({
        where: { importId },
        select: { runId: true, isSuperseded: true },
        orderBy: { runId: 'asc' },
      }),
    ).toEqual(runsBefore)
    expect((await ctx.prisma.import.findUniqueOrThrow({ where: { importId } })).status).toBe(statusBefore)
  })

  it('the same user reads the merchant-2 import as not found too', async () => {
    const a = await as(scopedToken, 'GET', `/imports/${importId}/validations`)
    const b = await as(scopedToken, 'GET', `/imports/${UNKNOWN_UUID}/validations`)

    expect(a.statusCode).toBe(404)
    expect(a.json()).toEqual(b.json())
  })
})
