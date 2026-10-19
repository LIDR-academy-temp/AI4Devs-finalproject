import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { type SettlementRequest, SettlementView } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Prisma } from '../../src/generated/prisma/client.js'
import { buildXlsx } from '../../src/modules/imports/infrastructure/xlsx/test-support.js'
import { loadSettlementInput } from '../../src/modules/settlement/application/load-settlement-input.js'
import { computeSettlement } from '../../src/modules/settlement/domain/compute-settlement.js'
import { PrismaSettlementReader } from '../../src/modules/settlement/infrastructure/prisma-settlement-reader.js'
import {
  PrismaSettlementRepository,
  type SettlementRepositoryOptions,
} from '../../src/modules/settlement/infrastructure/prisma-settlement-repository.js'
import { PrismaSettlementSource } from '../../src/modules/settlement/infrastructure/prisma-settlement-source.js'
import { PrismaMissingResolution } from '../../src/modules/validation/infrastructure/prisma-missing-resolution.js'
import { createTestApp, fixtureId, fixtureIds } from './helpers.js'
import {
  type AccountChannelRow,
  expectedOf,
  ImportFlow,
  restoreAccountChannels,
  snapshotAccountChannels,
} from './import-flow.js'

// Processing against SQL Server (settlement-process design D5–D7, D14–D16, D18, D19; spec settlement "Procesamiento
// atómico y auditado", "Movimientos por ciclo", "Asociación de canales al procesar", "Filas que no se procesan",
// "Totales del batch y amount payable", "Desglose del amount payable"). Everything a test processes is removed with
// its import, and the AccountChannel rows go back to the snapshot (RAM-07 stays "not assigned yet").
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string
let channels: AccountChannelRow[]
const ALL = { merchantIds: [1, 2] }
const BATCH_CLEAN_FEES: SettlementRequest['batchFees'] = [
  { feeTypeId: 121, feeId: null, amount: '25.0000', description: 'Wire Fee', source: 'file' },
  { feeTypeId: 117, feeId: null, amount: '15.0000', description: 'Settlement Fee', source: 'file' },
]

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-settlement-process-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
  channels = await snapshotAccountChannels(ctx.prisma)
})

afterAll(async () => {
  if (ctx) {
    try {
      await flow.close()
    } finally {
      await restoreAccountChannels(ctx.prisma, channels)
    }
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

const repository = (options: Partial<SettlementRepositoryOptions> = {}) =>
  new PrismaSettlementRepository(ctx.prisma, { missing: new PrismaMissingResolution(), log: ctx.app.log, ...options })

function process(
  importId: string,
  request: SettlementRequest,
  prefilled: number[] = [],
  options: Partial<SettlementRepositoryOptions> = {},
) {
  return repository(options).process({
    importId,
    userId: flow.userIds.analyst,
    request,
    prefilledFeeTypeIds: new Set(prefilled),
    now: new Date(),
  })
}

const view = async (batchId: string) => SettlementView.parse(await new PrismaSettlementReader(ctx.prisma).view(batchId))

const signedSum = (v: SettlementView) =>
  v.payableBreakdown
    .reduce((s, l) => (l.sign === '+' ? s.plus(l.amount) : s.minus(l.amount)), new Prisma.Decimal(0))
    .toFixed(4)

/** One-sheet import of ProviderA-USD-style template rows with the given source ids. */
const xlsx = (sheet: string, ids: string[]) =>
  buildXlsx({
    sheets: [{ name: sheet, rows: [['ID', 'Amount', 'Currency'], ...ids.map((id) => [id, { v: '10' }, 'USD'])] }],
  })

async function sourceIdOf(where: Prisma.Sql): Promise<string> {
  const [found] = await ctx.prisma.$queryRaw<{ sourceTransactionId: string }[]>`
    SELECT TOP 1 t.[sourceTransactionId] FROM [Transaction] t WHERE ${where}
      AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st WHERE st.[transactionId] = t.[transactionId])
    ORDER BY t.[transactionId] DESC`
  return found!.sourceTransactionId
}

describe('batch-clean end to end', () => {
  const summary = expectedOf('batch-clean').summary as {
    qty: Record<string, number>
    amounts: Record<string, string>
  }
  let importId: string
  let runId: number
  let batchId: string
  let processed: SettlementView
  let planned: ReturnType<typeof computeSettlement>
  let elapsedMs: number

  beforeAll(async () => {
    ;({ importId, runId } = await flow.validatedSample('batch-clean'))
    const request = { runId, confirmChannelAssignment: true, batchFees: BATCH_CLEAN_FEES }
    // What the preview computes before processing (design D19: the view is read back from what was written).
    const source = new PrismaSettlementSource(ctx.prisma)
    const context = await source.importContext(ALL, importId)
    planned = computeSettlement(
      await loadSettlementInput(source, {
        importId,
        account: context!.account,
        run: (await source.currentRun(importId))!,
        prefilledFeeTypeIds: new Set([121, 117]),
        request,
        // Processing computes the transactional fees (group 11): the preview of the comparison does too.
        options: { transactionalFees: true },
      }),
    )
    const started = Date.now()
    ;({ batchId } = await process(importId, request, [121, 117]))
    elapsedMs = Date.now() - started
    processed = await view(batchId)
  })

  // The next suites expect RAM-07 not assigned yet and batch-clean not settled.
  afterAll(async () => {
    try {
      await flow.removeImports([importId])
    } finally {
      await restoreAccountChannels(ctx.prisma, channels)
    }
  })

  // Target 3 s (design D6); the assertion leaves margin for a cold SQL Server in CI.
  it('processes batch-clean within 5 s, logging when it misses the 3 s target', () => {
    if (elapsedMs > 3_000) ctx.app.log.warn({ elapsedMs, targetMs: 3_000 }, 'batch-clean processing above target')
    expect(elapsedMs).toBeLessThan(5_000)
  })

  it('creates a processed attempt with the proposed number, nothing settled', async () => {
    expect(processed).toMatchObject({
      batchNo: expectedOf('batch-clean').proposedBatchNo,
      attemptNo: 1,
      status: 'processed',
      settledStatus: 'pending_payment',
      accountName: 'ProviderA-USD',
      approvedBy: { userName: 'analyst' },
    })
    const unsettled = await ctx.prisma.settlementTransaction.count({ where: { batchId, settlementStatusId: 0 } })
    expect(unsettled).toBe(780)
  })

  it('writes a movement per row, each with its sheet and row: 450 E, 10 I, 320 R', async () => {
    expect(processed.movements).toEqual(expectedOf('batch-clean').byCycle)
    expect(await ctx.prisma.settlementTransaction.count({ where: { batchId, sheetId: null } })).toBe(0)
  })

  it('totals qty, amounts and reserves as the oracle (RDR included)', () => {
    const total = (c: string) => processed.totals.find((t) => t.category === c)!
    for (const c of ['deposit', 'declined', 'chargeback', 'refund', 'rdr']) expect(total(c).qty).toBe(summary.qty[c])
    expect(total('deposit').amount).toBe(summary.amounts.deposit)
    expect(total('chargeback').amount).toBe(summary.amounts.chargeback)
    expect(total('refund').amount).toBe(summary.amounts.refund)
    expect(total('rdr').amount).toBe(summary.amounts.rdr)
    expect(processed.reserveHeldAmt).toBe(summary.amounts.reserveHeld)
    expect(processed.reserveReleasedAmt).toBe(summary.amounts.reserveReleased)
    expect(processed.reservesReleasedQty).toBe(summary.qty.reservesReleased)
  })

  it('keeps the two pre-filled fees in the order of the request, with the user', () => {
    expect(processed.batchFees.map((f) => [f.code, f.amount, f.source, f.enteredBy?.userName])).toEqual([
      ['Wire Fee', '25.0000', 'file', 'analyst'],
      ['Settlement Fee', '15.0000', 'file', 'analyst'],
    ])
    expect(processed.otherFeeAmt).toBe('40.0000')
  })

  it('applies the transactional fees of the oracle and writes their detail, each movement adding up', async () => {
    const fees = expectedOf('batch-clean').summary as { fees: Record<string, string>; amountPayable: string }
    const { mdrIncludedInDeposit: _, total, ...byCategory } = fees.fees
    expect(Object.fromEntries(processed.totals.map((t) => [t.category, t.feeAmount]))).toEqual(byCategory)
    expect(processed.transactionalFeeAmt).toBe(total)
    expect(processed.amountPayable).toBe(fees.amountPayable)
    // The MDR part of the deposit fee: ProviderA-USD charges a single 10 % MDR.
    expect(processed.mdrAmt).toBe(fees.fees.mdrIncludedInDeposit)
    expect(processed.mdrRate).toBe('0.100000')
    const mismatched = await ctx.prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*) AS n FROM [SettlementTransaction] st
      WHERE st.[batchId] = ${batchId}
        AND st.[feeAmount] <> (SELECT COALESCE(SUM(f.[amountUsd]), 0) FROM [SettlementTransactionFee] f
                               WHERE f.[settlementTxnId] = st.[settlementTxnId])`
    expect(Number(mismatched[0]!.n)).toBe(0)
    expect(await ctx.prisma.settlementTransactionFee.count({ where: { settlementTxn: { batchId } } })).toBeGreaterThan(
      0,
    )
  })

  it('reads back the same figures the engine computed, with a breakdown that adds up', () => {
    expect(processed.totals).toEqual(planned.summary.totals)
    expect(processed.amountPayable).toBe(planned.summary.amountPayable)
    expect(processed.payableBreakdown).toEqual(planned.summary.payableBreakdown)
    expect(signedSum(processed)).toBe(processed.amountPayable)
    // Each line against the oracle: the sum alone repeats the definition of amountPayable (review L3).
    expect(processed.payableBreakdown.map((l) => [l.code, l.sign, l.amount])).toEqual([
      ['deposit', '+', summary.amounts.deposit],
      ['chargeback', '-', summary.amounts.chargeback],
      ['refund', '-', summary.amounts.refund],
      ['rdr', '-', summary.amounts.rdr],
      ['transactional_fees', '-', '4336.6070'],
      ['batch_fees', '-', '40.0000'],
      ['reserve_held', '-', summary.amounts.reserveHeld],
      ['reserve_released', '+', summary.amounts.reserveReleased],
      ['reserve_early_released', '+', '0.0000'],
    ])
    expect(processed.skipped).toEqual(planned.skipped)
    expect(processed.warnings).toEqual(planned.warnings)
  })

  it('makes ProviderA-USD the primary account of RAM-07, created in this batch, with the user', async () => {
    expect(processed.channelsAssigned).toEqual([
      { channelId: 1007, name: 'RAM-07', assignment: 'new_primary', previousAccount: null },
    ])
    const row = await ctx.prisma.accountChannel.findFirstOrThrow({ where: { channelId: 1007, isPrimary: true } })
    expect(row).toMatchObject({
      accountId: flow.accountIds['ProviderA-USD'],
      assignedInBatchId: batchId,
      assignedByUserId: flow.userIds.analyst,
    })
  })

  it('leaves the import processed with this attempt as current, and audits it in the same transaction', async () => {
    const imported = await ctx.prisma.import.findUniqueOrThrow({ where: { importId } })
    expect(imported).toMatchObject({ status: 'processed', currentBatchId: batchId })
    const audit = await ctx.prisma.auditLog.findMany({
      where: { OR: [{ entityType: 'SettlementBatch', entityId: batchId }, { entityType: 'AccountChannel' }] },
      orderBy: { auditId: 'asc' },
    })
    const processAudit = audit.find((a) => a.action === 'settlement.process')!
    expect(processAudit.userId).toBe(flow.userIds.analyst)
    expect(JSON.parse(processAudit.detailJson!)).toMatchObject({
      importId,
      runId,
      batchNo: processed.batchNo,
      attemptNo: 1,
      movements: { E: 450, I: 10, R: 320 },
      batchFees: 2,
    })
    expect(audit.some((a) => a.action === 'account_channel.assign' && a.detailJson?.includes(batchId))).toBe(true)
  })
})

describe('legacy-provider: the CHB 2 and the findings of the run', () => {
  it('counts the CHB 2 in qty out of the amount, and marks the run findings as detected in the batch', async () => {
    const { importId, runId } = await flow.validatedSample('legacy-provider')

    const { batchId } = await process(importId, { runId })

    const processed = await view(batchId)
    expect(processed.totals.find((t) => t.category === 'chargeback')).toMatchObject({ qty: 1, amount: '0.0000' })
    const run = await ctx.prisma.validationRun.findUniqueOrThrow({
      where: { runId },
      select: { results: { select: { issues: { select: { detectedInBatchId: true } } } } },
    })
    const issues = run.results.flatMap((r) => r.issues)
    expect(issues).toHaveLength(3)
    expect(issues.every((i) => i.detectedInBatchId === batchId)).toBe(true)
    expect(processed.validationSummary).toMatchObject({ runId, persistent: 3, resolved: 0, blocking: 0 })
    // The next suites need ProviderC-Alt transactions never settled.
    await flow.removeImports([importId])
  })
})

describe('attempts', () => {
  it('a number with an undone attempt is accepted again as attempt 2, with its movements and rounds', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 2`)
    // Y: a refund whose E was settled in a paid batch of the history (another import): round 2.
    const y = await adjustmentIdOf(
      Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 5 AND t.[lastStatusChangedAt] IS NOT NULL`,
    )
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          rows: [
            ['ID', 'Amount', 'Currency'],
            [id, { v: '10' }, 'USD'],
          ],
        },
        {
          name: 'REF',
          rows: [
            ['ID', 'Amount', 'Currency'],
            [id, { v: '10' }, 'USD'],
            [y, { v: '10' }, 'USD'],
          ],
        },
      ],
    })
    const first = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [{ name: 'a1.xlsx', bytes }])
    const runId = await flow.validateAndReview(first.importId)
    const { batchId } = await undone(await process(first.importId, { runId, batchNo: 9801 }))
    await ctx.prisma.import.update({
      where: { importId: first.importId },
      data: { status: 'analyzed', currentBatchId: null },
    })
    const rerun = await flow.validateAndReview(first.importId)

    const second = await process(first.importId, { runId: rerun, batchNo: 9801 })

    expect(await view(second.batchId)).toMatchObject({ batchNo: 9801, attemptNo: 2, status: 'processed' })
    // The E of `id` in the undone attempt of the same import is not a previous E: its refund is round 1 (E in this
    // batch); Y's E is in a batch of another import: round 2.
    const [tId, tY] = [await transactionOf(101, id), await transactionOf(101, y)]
    const rounds = await ctx.prisma.settlementTransaction.findMany({
      where: { batchId: second.batchId },
      orderBy: [{ cycle: 'asc' }, { transactionId: 'asc' }],
      select: { cycle: true, transactionId: true, roundNo: true },
    })
    expect(rounds).toEqual(
      [
        { cycle: 'E', transactionId: tId.transactionId, roundNo: null },
        { cycle: 'I', transactionId: tId.transactionId, roundNo: 1 },
        { cycle: 'I', transactionId: tY.transactionId, roundNo: 2 },
      ].sort((a, b) => (a.cycle === b.cycle ? Number(a.transactionId - b.transactionId) : a.cycle < b.cycle ? -1 : 1)),
    )
    expect(batchId).not.toBe(second.batchId)
    // Their runs flag the neighbours of these transactions as missing in range: the next suites need them clean.
    await flow.removeImports([first.importId])
  })

  it('an E only in an undone attempt of another import is not a previous E: the adjustment has no round', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 2`)
    const withE = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'u1.xlsx', bytes: xlsx('APP', [id]) },
    ])
    await undone(await process(withE.importId, { runId: await flow.validateAndReview(withE.importId), batchNo: 9802 }))
    const withI = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'u2.xlsx', bytes: xlsx('REF', [id]) },
    ])

    const { batchId } = await process(withI.importId, { runId: await flow.validateAndReview(withI.importId) })

    const t = await transactionOf(101, id)
    const [movement] = await ctx.prisma.settlementTransaction.findMany({
      where: { batchId, transactionId: t.transactionId },
      select: { cycle: true, roundNo: true },
    })
    expect(movement).toEqual({ cycle: 'I', roundNo: null })
    await flow.removeImports([withE.importId, withI.importId])
  })
})

/** Undo is tramo 6: the test marks the attempt undone, as undo will. */
async function undone<T extends { batchId: string }>(processed: T): Promise<T> {
  await ctx.prisma.settlementBatch.update({
    where: { batchId: processed.batchId },
    data: { status: 'undone', undoneAt: new Date(), undoneByUserId: flow.userIds.analyst, undoReason: 'test' },
  })
  return processed
}

describe('rows that are not processed', () => {
  it('a row whose status could not be resolved is counted in skipped, not processed', async () => {
    const good = await sourceIdOf(Prisma.sql`t.[providerId] = 201 AND t.[channelId] = 2002 AND t.[statusId] = 2`)
    const odd = await sourceIdOf(
      Prisma.sql`t.[providerId] = 201 AND t.[channelId] = 2002 AND t.[statusId] = 2 AND t.[sourceTransactionId] <> ${good}`,
    )
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'TRX',
          rows: [
            ['Merchant Order No#', 'Order Status', 'Amount USD'],
            [good, 'Successful', { v: '10' }],
            [odd, 'Not a status', { v: '10' }],
          ],
        },
      ],
    })
    const detail = await flow.analyzed(flow.accountIds['ProviderC-Alt']!, [{ name: 'legacy-odd.xlsx', bytes }])
    const runId = await flow.validateAndReview(detail.importId)

    const processed = await view((await process(detail.importId, { runId })).batchId)

    expect(processed.skipped).toMatchObject({ unresolvedStatus: 1 })
    expect(processed.movements).toEqual({ E: 1, I: 0, R: 0 })
  })
})

describe('warnings of the account', () => {
  it('ProviderA-EUR has a reserve cap that is not applied', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1003 AND t.[statusId] = 2`)
    const detail = await flow.analyzed(flow.accountIds['ProviderA-EUR']!, [
      { name: 'eur.xlsx', bytes: xlsx('APP', [id]) },
    ])
    const runId = await flow.validateAndReview(detail.importId)

    const processed = await view((await process(detail.importId, { runId })).batchId)

    expect(processed.warnings.map((w) => w.code)).toContain('reserve_cap_not_applied')
  })

  it('ProviderB-Main releases on chargeback, a policy not applied yet (#62)', async () => {
    const { importId, runId } = await flow.validatedSample('batch-issues')

    const processed = await view((await process(importId, { runId, confirmChannelAssignment: true })).batchId)

    expect(processed.warnings.map((w) => w.code)).toContain('chargeback_reserve_policy_not_applied')
    expect(processed.reserveEarlyReleasedAmt).toBe('0.0000')
    expect(processed.skipped.unmatched).toBe(1)
  })
})

describe('channels', () => {
  it('without the confirmation, a batch with a channel not assigned yet answers 409 and writes nothing', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1007 AND t.[statusId] = 2`)
    const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'r7.xlsx', bytes: xlsx('APP', [id]) },
    ])
    const runId = await flow.validateAndReview(detail.importId)

    await expect(process(detail.importId, { runId })).rejects.toMatchObject({
      code: 'channel_assignment_not_confirmed',
      details: { channels: [{ channelId: 1007, name: 'RAM-07', assignment: 'unassigned', otherAccount: null }] },
    })
    expect(await ctx.prisma.settlementBatch.count({ where: { importId: detail.importId } })).toBe(0)
    expect((await ctx.prisma.import.findUniqueOrThrow({ where: { importId: detail.importId } })).status).toBe(
      'validated',
    )
  })

  it('a channel whose primary is ProviderA-EUR moves to ProviderA-USD; EUR keeps its row without isPrimary', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1003 AND t.[statusId] = 2`)
    const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'r3.xlsx', bytes: xlsx('APP', [id]) },
    ])
    const runId = await flow.validateAndReview(detail.importId)

    const processed = await view((await process(detail.importId, { runId, confirmChannelAssignment: true })).batchId)

    expect(processed.channelsAssigned).toEqual([
      {
        channelId: 1003,
        name: 'RAM-03',
        assignment: 'primary_moved_from',
        previousAccount: { accountId: flow.accountIds['ProviderA-EUR'], name: 'ProviderA-EUR' },
      },
    ])
    const rows = await ctx.prisma.accountChannel.findMany({
      where: { channelId: 1003 },
      orderBy: { isPrimary: 'desc' },
    })
    expect(rows.map((r) => [r.accountId, r.isPrimary])).toEqual([
      [flow.accountIds['ProviderA-USD'], true],
      [flow.accountIds['ProviderA-EUR'], false],
    ])
    await restoreAccountChannels(ctx.prisma, channels)
  })
})

/** An adjusted transaction whose E was settled and whose I never was: the history leaves none without any movement. */
async function adjustmentIdOf(where: Prisma.Sql): Promise<string> {
  const [found] = await ctx.prisma.$queryRaw<{ sourceTransactionId: string }[]>`
    SELECT TOP 1 t.[sourceTransactionId] FROM [Transaction] t WHERE ${where}
      AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st
                      WHERE st.[transactionId] = t.[transactionId] AND st.[cycle] = 'I')
    ORDER BY t.[transactionId] DESC`
  return found!.sourceTransactionId
}

const transactionOf = (providerId: number, sourceTransactionId: string) =>
  ctx.prisma.transaction.findFirstOrThrow({ where: { providerId, sourceTransactionId } })

const movementsOf = (batchId: string, transactionId: bigint) =>
  ctx.prisma.settlementTransaction.findMany({
    where: { batchId, transactionId },
    orderBy: { settlementTxnId: 'asc' },
    include: { appliedFees: { orderBy: { appliedFeeId: 'asc' } } },
  })

describe('two movements of one transaction in a batch (UX_SettlementTransaction_batch_row)', () => {
  it('a Refund and a Chargeback of the same transaction: two I movements, each with its amount, fee and date', async () => {
    // Gateway status Refund: the REF row is dated by lastStatusChangedAt, the CHB row cannot be dated (design P6).
    const id = await adjustmentIdOf(
      Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 5 AND t.[lastStatusChangedAt] IS NOT NULL`,
    )
    const t = await transactionOf(101, id)
    const bytes = buildXlsx({
      sheets: ['REF', 'CHB'].map((name) => ({
        name,
        rows: [
          ['ID', 'Amount', 'Currency'],
          [id, { v: '10' }, 'USD'],
        ],
      })),
    })
    const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [{ name: 'ref-chb.xlsx', bytes }])
    const runId = await flow.validateAndReview(detail.importId)

    const { batchId } = await process(detail.importId, { runId })

    const movements = await movementsOf(batchId, t.transactionId)
    expect(
      movements.map((m) => [m.cycle, m.statusId, m.amount.toFixed(4), m.feeAmount.toFixed(4), m.eventDate]),
    ).toEqual([
      ['I', 5, t.amount.toFixed(4), '5.0000', t.lastStatusChangedAt],
      ['I', 4, t.amount.toFixed(4), '45.0000', null],
    ])
    expect(movements.map((m) => m.appliedFees.map((f) => [f.feeTypeId, f.eventDate]))).toEqual([
      [[5, t.lastStatusChangedAt]],
      [[4, null]],
    ])
    // Its run flags the neighbours of X as missing in range: the next suites need them without findings.
    await flow.removeImports([detail.importId])
  })

  it('a Chargeback and a CHB 2 of the same transaction: two I movements, the CHB 2 out of chargebackAmt', async () => {
    const id = await adjustmentIdOf(Prisma.sql`t.[providerId] = 201 AND t.[channelId] = 2002 AND t.[statusId] = 4`)
    const t = await transactionOf(201, id)
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'CB', // the legacy sheet of adjustments: cycle I, the status from Order Status
          rows: [
            ['Merchant Order No#', 'Order Status', 'Amount USD'],
            [id, 'Chargeback', { v: '10' }],
            [id, 'CHB 2', { v: '10' }],
          ],
        },
      ],
    })
    const detail = await flow.analyzed(flow.accountIds['ProviderC-Alt']!, [{ name: 'legacy-chb2.xlsx', bytes }])
    const runId = await flow.validateAndReview(detail.importId)

    const { batchId } = await process(detail.importId, { runId })

    const movements = await movementsOf(batchId, t.transactionId)
    expect(movements.map((m) => [m.cycle, m.statusId, m.excludeAmount])).toEqual([
      ['I', 4, false],
      ['I', 4, true],
    ])
    const chargeback = (await view(batchId)).totals.find((c) => c.category === 'chargeback')!
    expect(chargeback).toMatchObject({ qty: 2, amount: t.amount.toFixed(4) })
    await flow.removeImports([detail.importId])
  })
})

describe('missing findings resolved by processing', () => {
  // A processed import of ProviderA-USD whose current run keeps X missing in I (fixture straight in the base).
  const fixtureImportId = randomUUID()
  let issueId: number

  afterAll(async () => {
    const importId = fixtureId(fixtureImportId, 'fixtureImportId')
    const runs = await ctx.prisma.validationRun.findMany({ where: { importId } })
    const runIds = fixtureIds(
      runs.map((r) => r.runId),
      'runIds',
    )
    await ctx.prisma.validationIssue.deleteMany({ where: { result: { runId: { in: runIds } } } })
    await ctx.prisma.validationResult.deleteMany({ where: { runId: { in: runIds } } })
    await ctx.prisma.validationRun.deleteMany({ where: { runId: { in: runIds } } })
    await ctx.prisma.import.deleteMany({ where: { importId } })
  })

  it('a persistent missing of another import passes to resolved, and validationSummary.resolvedMissing = 1', async () => {
    // X without findings of its own in I: the runs of the other suites flag their neighbours as missing in range.
    const id = await adjustmentIdOf(
      Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 5 AND t.[lastStatusChangedAt] IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM [ValidationIssue] vi
                        WHERE vi.[transactionId] = t.[transactionId] AND vi.[cycle] = 'I')`,
    )
    const t = await transactionOf(101, id)
    await ctx.prisma.import.create({
      data: {
        importId: fixtureImportId,
        accountId: flow.accountIds['ProviderA-USD']!,
        createdByUserId: flow.userIds.analyst,
        status: 'processed',
      },
    })
    const run = await ctx.prisma.validationRun.create({
      data: { importId: fixtureImportId, runByUserId: flow.userIds.analyst },
    })
    const result = await ctx.prisma.validationResult.create({
      data: { runId: run.runId, validationCode: 'missing_previous_to_batch', outcome: 'warning' },
    })
    ;({ issueId } = await ctx.prisma.validationIssue.create({
      data: {
        resultId: result.resultId,
        issueType: 'missing',
        scope: 'previous_to_batch',
        missingType: 'previous_to_batch',
        transactionId: t.transactionId,
        cycle: 'I',
        resolutionStatus: 'persistent',
      },
    }))
    const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'ref-missing.xlsx', bytes: xlsx('REF', [id]) },
    ])
    const runId = await flow.validateAndReview(detail.importId)

    const { batchId } = await process(detail.importId, { runId })

    expect((await view(batchId)).validationSummary.resolvedMissing).toBe(1)
    expect(
      await ctx.prisma.validationIssue.findUniqueOrThrow({
        where: { issueId },
        select: { resolutionStatus: true, resolvedInBatchId: true, resolvedByUserId: true },
      }),
    ).toEqual({ resolutionStatus: 'resolved', resolvedInBatchId: batchId, resolvedByUserId: null })
  })
})

describe('the fees of a processed attempt', () => {
  it('editing the fee after processing changes neither the view nor the detail of the attempt', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 2`)
    const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'fee-edit.xlsx', bytes: xlsx('APP', [id]) },
    ])
    const runId = await flow.validateAndReview(detail.importId)
    const { batchId } = await process(detail.importId, { runId })
    const before = await view(batchId)
    const detailRows = () =>
      ctx.prisma.settlementTransactionFee.findMany({
        where: { settlementTxn: { batchId } },
        orderBy: { appliedFeeId: 'asc' },
        select: { feeId: true, amountUsd: true, configurationSnapshot: true },
      })
    const rowsBefore = await detailRows()
    const mdr = await ctx.prisma.fee.findFirstOrThrow({
      where: { accountId: flow.accountIds['ProviderA-USD'], feeTypeId: 1 },
    })

    try {
      await ctx.prisma.fee.update({ where: { feeId: mdr.feeId }, data: { percentage: '0.200000' } })

      expect(await view(batchId)).toEqual(before)
      expect(await detailRows()).toEqual(rowsBefore)
    } finally {
      await ctx.prisma.fee.update({ where: { feeId: mdr.feeId }, data: { percentage: mdr.percentage } })
    }
  })
})

describe('a run blocked under the transaction', () => {
  it('a current run that turned blocked after the review answers 409 blocking_validation_issue, nothing written', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 2`)
    const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'blocked.xlsx', bytes: xlsx('APP', [id]) },
    ])
    const runId = await flow.validateAndReview(detail.importId)
    // Injected: the review never lets a blocked run through, so the check inside the transaction is defensive.
    await ctx.prisma.validationResult.updateMany({
      where: { runId, validationCode: 'provider_mismatch' },
      data: { outcome: 'blocked' },
    })

    await expect(process(detail.importId, { runId })).rejects.toMatchObject({
      code: 'blocking_validation_issue',
      details: { runId, validationCodes: ['provider_mismatch'] },
    })
    expect(await ctx.prisma.settlementBatch.count({ where: { importId: detail.importId } })).toBe(0)
    expect((await ctx.prisma.import.findUniqueOrThrow({ where: { importId: detail.importId } })).status).toBe(
      'validated',
    )
  })
})

describe('a failure halfway', () => {
  it('leaves no attempt, movement, fee, association nor audit, and the import validated', async () => {
    const { importId, runId } = await flow.validatedSample('batch-clean')
    const before = await ctx.prisma.auditLog.count()

    await expect(
      process(importId, { runId, confirmChannelAssignment: true, batchFees: BATCH_CLEAN_FEES }, [121, 117], {
        beforePhase: async (phase) => {
          if (phase === 'totals') throw new Error('injected failure at totals')
        },
      }),
    ).rejects.toThrow('injected failure at totals')

    expect(await ctx.prisma.settlementBatch.count({ where: { importId } })).toBe(0)
    expect((await ctx.prisma.import.findUniqueOrThrow({ where: { importId } })).status).toBe('validated')
    expect(await ctx.prisma.accountChannel.count({ where: { channelId: 1007 } })).toBe(0)
    expect(await ctx.prisma.auditLog.count()).toBe(before)
  })
})

// SQL Server chooses one transaction as the deadlock victim (1205): through the mssql adapter it arrives as a
// PrismaClientKnownRequestError (P2010 from raw SQL, P2034 from the client) whose driver adapter cause has
// kind TransactionWriteConflict, the kind the adapter gives only to 1205. The shape observed in a real deadlock.
const deadlockVictim = () =>
  new Prisma.PrismaClientKnownRequestError(
    'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
    {
      code: 'P2034',
      clientVersion: Prisma.prismaVersion.client,
      meta: {
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: {
            originalCode: 'EREQUEST',
            originalMessage:
              'Transaction (Process ID 70) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.',
            kind: 'TransactionWriteConflict',
          },
        },
      },
    },
  )

describe('a deadlock victim', () => {
  const victimAt = (failures: number) => {
    let left = failures
    return async (phase: string) => {
      if (phase === 'totals' && left > 0) {
        left -= 1
        throw deadlockVictim()
      }
    }
  }

  it('is retried: the second attempt of the transaction processes the batch', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 2`)
    const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'victim-once.xlsx', bytes: xlsx('APP', [id]) },
    ])
    const runId = await flow.validateAndReview(detail.importId)

    const { batchId } = await process(detail.importId, { runId }, [], { beforePhase: victimAt(1) })

    expect(await view(batchId)).toMatchObject({ status: 'processed', movements: { E: 1, I: 0, R: 0 } })
    expect(await ctx.prisma.settlementBatch.count({ where: { importId: detail.importId } })).toBe(1)
  })

  it('three in a row answer 409 settlement_busy and leave nothing', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 2`)
    const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'victim-thrice.xlsx', bytes: xlsx('APP', [id]) },
    ])
    const runId = await flow.validateAndReview(detail.importId)
    const before = await ctx.prisma.auditLog.count()

    await expect(process(detail.importId, { runId }, [], { beforePhase: victimAt(3) })).rejects.toMatchObject({
      status: 409,
      code: 'settlement_busy',
      message: 'Another settlement is being processed for this provider; retry',
    })
    expect(await ctx.prisma.settlementBatch.count({ where: { importId: detail.importId } })).toBe(0)
    expect((await ctx.prisma.import.findUniqueOrThrow({ where: { importId: detail.importId } })).status).toBe(
      'validated',
    )
    expect(await ctx.prisma.auditLog.count()).toBe(before)
  })
})
