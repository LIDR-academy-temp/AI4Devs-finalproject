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
import { createTestApp } from './helpers.js'
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
    await flow.close()
    await restoreAccountChannels(ctx.prisma, channels)
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
        options: { transactionalFees: false },
      }),
    )
    const started = Date.now()
    ;({ batchId } = await process(importId, request, [121, 117]))
    expect(Date.now() - started).toBeLessThan(3_000)
    processed = await view(batchId)
  })

  // The next suites expect RAM-07 not assigned yet and batch-clean not settled.
  afterAll(async () => {
    await flow.removeImports([importId])
    await restoreAccountChannels(ctx.prisma, channels)
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

  it('reads back the same figures the engine computed, with a breakdown that adds up', () => {
    expect(processed.totals).toEqual(planned.summary.totals)
    expect(processed.amountPayable).toBe(planned.summary.amountPayable)
    expect(processed.payableBreakdown).toEqual(planned.summary.payableBreakdown)
    expect(signedSum(processed)).toBe(processed.amountPayable)
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
  })
})

describe('attempts', () => {
  it('a number with an undone attempt is accepted again as attempt 2', async () => {
    const id = await sourceIdOf(Prisma.sql`t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 2`)
    const first = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [
      { name: 'a1.xlsx', bytes: xlsx('APP', [id]) },
    ])
    const runId = await flow.validateAndReview(first.importId)
    const { batchId } = await process(first.importId, { runId, batchNo: 9801 })
    // Undo is tramo 6: the test marks the attempt undone and the import analyzed, as undo will.
    await ctx.prisma.settlementBatch.update({
      where: { batchId },
      data: { status: 'undone', undoneAt: new Date(), undoneByUserId: flow.userIds.analyst, undoReason: 'test' },
    })
    await ctx.prisma.import.update({
      where: { importId: first.importId },
      data: { status: 'analyzed', currentBatchId: null },
    })
    const rerun = await flow.validateAndReview(first.importId)

    const second = await process(first.importId, { runId: rerun, batchNo: 9801 })

    expect(await view(second.batchId)).toMatchObject({ batchNo: 9801, attemptNo: 2, status: 'processed' })
  })
})

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
