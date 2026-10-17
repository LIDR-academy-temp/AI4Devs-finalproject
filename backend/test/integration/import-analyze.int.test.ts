import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { ImportDetail, ImportRowItem, ImportRowsPage, type MappingConfirmation } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaAuditLogger } from '../../src/infrastructure/prisma-audit-logger.js'
import type { Scope } from '../../src/modules/catalog/domain/scope.js'
import { ImportService } from '../../src/modules/imports/application/import-service.js'
import { ImportNotEditableError } from '../../src/modules/imports/domain/errors.js'
import { FsFileStore } from '../../src/modules/imports/infrastructure/fs-file-store.js'
import { PrismaAccountContext } from '../../src/modules/imports/infrastructure/prisma-account-context.js'
import { PrismaFeeTypeCatalog } from '../../src/modules/imports/infrastructure/prisma-fee-type-catalog.js'
import { PrismaImportRepository } from '../../src/modules/imports/infrastructure/prisma-import-repository.js'
import { PrismaImportRowRepository } from '../../src/modules/imports/infrastructure/prisma-import-row-repository.js'
import { PrismaTransactionLookup } from '../../src/modules/imports/infrastructure/prisma-transaction-lookup.js'
import { DEFAULT_READ_LIMITS } from '../../src/modules/imports/infrastructure/xlsx/limits.js'
import { buildXlsx, type CellInput } from '../../src/modules/imports/infrastructure/xlsx/test-support.js'
import { XlsxWorkbookReader } from '../../src/modules/imports/infrastructure/xlsx-workbook-reader.js'
import { PrismaMatchingRulesRepository } from '../../src/modules/matching/infrastructure/prisma-matching-rules-repository.js'
import { createTestApp, SEED_PASSWORD } from './helpers.js'

// Oracle: data/samples/*/expected.json read from disk (README §2.6), over the seeded database. Temporary fixtures
// (gateway/channel/transaction 9001, the ZZ-NoChannels account) are created and removed by this file alone, with fixed
// ids outside the seed's ranges; never added to the seed.
const SAMPLES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/samples')
const BATCH_CLEAN = 'batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx'
const PART1 = 'batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx'
const PART2 = 'batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx'
const BATCH_ISSUES = 'batch-issues/Recon_Template_ProviderB-Main_batch-issues.xlsx'
const BATCH_BLOCKED = 'batch-blocked/Recon_Template_ProviderB-Main_batch-blocked.xlsx'
const LEGACY = 'legacy-provider/Legacy_ProviderC-Alt_batch.xlsx'
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
const FIRST_APP_ID = '252570479111759'
const GATEWAY_TEST = 9001
const CHANNEL_TEST = 9001
const NO_CHANNELS_ACCOUNT_ID = 'a0000000-0000-4000-8000-00000000ee01'
const NO_CHANNELS_ACCOUNT_NAME = 'ZZ-NoChannels'
const OTHER_MERCHANT_CHANNEL = 9002
const OTHER_MERCHANT_SOURCE_ID = '919191919191919'
const ROW_CAP = 100_000
const BENCH = process.env.RECON_BENCH === '1'

interface Expected {
  rows: { read: number; matched: number; unmatched: number; ambiguous?: number; ignoredEmptyId?: number }
  byCycle?: { E: number; I: number; R: number }
  warnings?: { newChannels?: string[]; negativeAmounts?: number; nonUsdCurrency?: number; unknownFeeTypes?: string[] }
  batchFeesPrefilled?: { feeType: string; amount: number }[]
  affectedIds?: { unmatched?: string[] }
  excludeAmountRows?: string[]
}

interface Part {
  name: string
  bytes: Uint8Array
}

let ctx: Awaited<ReturnType<typeof createTestApp>>
let uploadDir: string
const accountIds: Record<string, string> = {}
const tokens: Record<string, string> = {}
const createdImportIds = new Set<string>()
let analystId: number

function samplePart(relative: string): Part {
  return { name: path.basename(relative), bytes: readFileSync(path.join(SAMPLES, relative)) }
}

function expectedOf(sample: string): Expected {
  return JSON.parse(readFileSync(path.join(SAMPLES, sample, 'expected.json'), 'utf8')) as Expected
}

async function multipart(parts: Part[]): Promise<{ payload: Buffer; contentType: string }> {
  const form = new FormData()
  for (const part of parts) form.append('files', new Blob([new Uint8Array(part.bytes)]), part.name)
  const response = new Response(form)
  return {
    payload: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') as string,
  }
}

async function upload(accountId: string, parts: Part[], user: 'analyst' | 'viewer' = 'analyst') {
  const { payload, contentType } = await multipart(parts)
  const res = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/accounts/${accountId}/imports`,
    headers: { authorization: `Bearer ${tokens[user]}`, 'content-type': contentType },
    payload,
  })
  if (res.statusCode === 201) createdImportIds.add(res.json().importId)
  return res
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

function call(method: Method, url: string, body?: object, user: 'analyst' | 'viewer' = 'analyst') {
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers: { authorization: `Bearer ${tokens[user]}` },
    ...(body === undefined ? {} : { payload: body }),
  })
}

/** The proposal as the detail returned it, turned into a confirmation body. */
function confirmProposal(detail: ImportDetail): MappingConfirmation {
  return {
    sheets: detail.files.flatMap((file) =>
      file.sheets.map((sheet) => {
        if (sheet.proposed.kind === null) throw new Error(`sheet ${sheet.sheetName} has no proposal`)
        return {
          sheetId: sheet.sheetId,
          kind: sheet.proposed.kind,
          cycle: sheet.proposed.cycle,
          statusId: sheet.proposed.statusId,
          columns: sheet.columns.flatMap((c) =>
            c.targetField === null ? [] : [{ sourceColumn: c.sourceColumn, targetField: c.targetField }],
          ),
        }
      }),
    ),
  }
}

async function uploaded(accountId: string, parts: Part[]): Promise<ImportDetail> {
  const res = await upload(accountId, parts)
  expect(res.statusCode).toBe(201)
  return ImportDetail.parse(res.json())
}

async function mapped(
  accountId: string,
  parts: Part[],
  edit?: (body: MappingConfirmation, detail: ImportDetail) => void,
) {
  const detail = await uploaded(accountId, parts)
  const body = confirmProposal(detail)
  edit?.(body, detail)
  const res = await call('PUT', `/imports/${detail.importId}/mapping`, body)
  expect(res.statusCode).toBe(200)
  return ImportDetail.parse(res.json())
}

async function analyzed(accountId: string, parts: Part[]): Promise<{ detail: ImportDetail; ms: number }> {
  const before = await mapped(accountId, parts)
  const started = performance.now()
  const res = await call('POST', `/imports/${before.importId}/analyze`)
  const ms = performance.now() - started
  expect(res.statusCode, res.body).toBe(200)
  return { detail: ImportDetail.parse(res.json()), ms }
}

async function rows(importId: string, query = ''): Promise<ImportRowsPage> {
  const res = await call('GET', `/imports/${importId}/rows${query}`)
  expect(res.statusCode).toBe(200)
  return ImportRowsPage.parse(res.json())
}

const sheetNamed = (detail: ImportDetail, name: string) => {
  const sheet = detail.files.flatMap((f) => f.sheets).find((s) => s.sheetName === name)
  if (!sheet) throw new Error(`sheet ${name} missing`)
  return sheet
}

/** Removes the given imports with their audit entries, rows, column maps, sheets and files. Idempotent. */
async function removeImports(importIds: string[]): Promise<void> {
  if (importIds.length === 0) return
  const { prisma } = ctx
  await prisma.auditLog.deleteMany({ where: { action: 'import.cancel', entityId: { in: importIds } } })
  const sheetIds = (
    await prisma.importSheet.findMany({ where: { file: { importId: { in: importIds } } }, select: { sheetId: true } })
  ).map((s) => s.sheetId)
  if (sheetIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        action: 'import.row.resolve_gateway',
        OR: sheetIds.map((id) => ({ entityId: { startsWith: `${id}:` } })),
      },
    })
  }
  await prisma.importRow.deleteMany({ where: { sheet: { file: { importId: { in: importIds } } } } })
  await prisma.importSheetColumnMap.deleteMany({ where: { sheet: { file: { importId: { in: importIds } } } } })
  await prisma.importSheet.deleteMany({ where: { file: { importId: { in: importIds } } } })
  await prisma.importFile.deleteMany({ where: { importId: { in: importIds } } })
  await prisma.import.deleteMany({ where: { importId: { in: importIds } } })
  for (const id of importIds) createdImportIds.delete(id)
}

/** The gateway 9001 fixture (its transaction, association, channel and gateway); its import is removed by its group. */
async function removeGatewayFixture(): Promise<void> {
  const { prisma } = ctx
  await prisma.transaction.deleteMany({ where: { gatewayId: GATEWAY_TEST } })
  await prisma.accountChannel.deleteMany({ where: { channelId: CHANNEL_TEST } })
  await prisma.channel.deleteMany({ where: { channelId: CHANNEL_TEST } })
  await prisma.gateway.deleteMany({ where: { gatewayId: GATEWAY_TEST } })
}

/** The ZZ-NoChannels account with every import it holds. */
async function removeNoChannelsAccount(): Promise<void> {
  const { prisma } = ctx
  const account = await prisma.account.findUnique({
    where: { name: NO_CHANNELS_ACCOUNT_NAME },
    select: { accountId: true },
  })
  if (!account) return
  const imports = await prisma.import.findMany({ where: { accountId: account.accountId }, select: { importId: true } })
  await removeImports(imports.map((i) => i.importId))
  await prisma.account.delete({ where: { accountId: account.accountId } })
}

/** The channel 9002 fixture of another merchant on gateway 1 (its transaction, association and channel). */
async function removeOtherMerchantFixture(): Promise<void> {
  const { prisma } = ctx
  await prisma.transaction.deleteMany({ where: { channelId: OTHER_MERCHANT_CHANNEL } })
  await prisma.accountChannel.deleteMany({ where: { channelId: OTHER_MERCHANT_CHANNEL } })
  await prisma.channel.deleteMany({ where: { channelId: OTHER_MERCHANT_CHANNEL } })
}

/** Safety net at file level, for runs interrupted before a group could clean up; every group removes its own fixtures. */
async function removeTestFixtures(): Promise<void> {
  await removeImports([...createdImportIds])
  await removeNoChannelsAccount()
  await removeGatewayFixture()
  await removeOtherMerchantFixture()
}

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-analyze-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  const { app, prisma } = ctx
  for (const a of await prisma.account.findMany({ select: { accountId: true, name: true } }))
    accountIds[a.name] = a.accountId
  for (const userName of ['analyst', 'viewer'] as const) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    tokens[userName] = res.json().accessToken
  }
  analystId = (await prisma.user.findUniqueOrThrow({ where: { userName: 'analyst' } })).userId
  await removeTestFixtures()
})

afterAll(async () => {
  if (ctx) {
    await removeTestFixtures()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

describe('the five samples against their expected.json (issue #5, criteria 2, 3 and 5)', () => {
  const cases: [string, string, string[]][] = [
    ['batch-clean', 'ProviderA-USD', [BATCH_CLEAN]],
    ['batch-split', 'ProviderA-USD', [PART1, PART2]],
    ['batch-issues', 'ProviderB-Main', [BATCH_ISSUES]],
    ['batch-blocked', 'ProviderB-Main', [BATCH_BLOCKED]],
    ['legacy-provider', 'ProviderC-Alt', [LEGACY]],
  ]

  it.each(cases)('%s: rows, cycles, channels, warnings and batch fees match', async (sample, account, files) => {
    const expected = expectedOf(sample)

    const { detail } = await analyzed(accountIds[account] as string, files.map(samplePart))

    expect(detail.status).toBe('analyzed')
    expect(detail.analyzedAt).not.toBeNull()
    expect(detail.analysis?.rows).toEqual({
      total: expected.rows.read,
      matched: expected.rows.matched,
      unmatched: expected.rows.unmatched,
      ambiguous: expected.rows.ambiguous ?? 0,
      ignored: expected.rows.ignoredEmptyId ?? 0,
    })
    expect(detail).toMatchObject({
      rowsTotal: expected.rows.read,
      rowsMatched: expected.rows.matched,
      rowsUnmatched: expected.rows.unmatched,
    })
    if (expected.byCycle) expect(detail.analysis?.byCycle).toEqual(expected.byCycle)
    expect(detail.analysis?.warnings).toMatchObject({
      negative_amount: expected.warnings?.negativeAmounts ?? 0,
      non_usd_currency: expected.warnings?.nonUsdCurrency ?? 0,
      lossy_numeric_id: 0,
      status_unresolved: 0,
    })
    const unassigned = detail.channels?.filter((c) => c.assignment === 'unassigned').map((c) => c.name) ?? []
    expect(unassigned).toEqual(expected.warnings?.newChannels ?? [])
    if (expected.batchFeesPrefilled) {
      expect(detail.batchFees?.map((f) => [f.title, f.amount])).toEqual(
        expected.batchFeesPrefilled.map((f) => [f.feeType, f.amount.toFixed(4)]),
      )
      const unknown = detail.batchFees?.filter((f) => f.feeTypeId === null).map((f) => f.title) ?? []
      expect(unknown).toEqual(expected.warnings?.unknownFeeTypes ?? [])
    }
    const unmatched = await rows(detail.importId, '?match=unmatched')
    expect(unmatched.items.map((r) => r.transactionIdRaw)).toEqual(expected.affectedIds?.unmatched ?? [])
    if (expected.excludeAmountRows) {
      const all = await rows(detail.importId, '?pageSize=500')
      expect(all.items.filter((r) => r.excludeAmount).map((r) => r.transactionIdRaw)).toEqual(
        expected.excludeAmountRows,
      )
    }
    expect((await call('GET', `/imports/${detail.importId}`)).json()).toEqual(JSON.parse(JSON.stringify(detail)))
  })

  it('batch-clean: persisted rows per sheet, confirmed column maps, the R status, the leftover rows, under 3 s', async () => {
    const { detail, ms } = await analyzed(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])
    console.info(`[D1] analyze batch-clean end to end: ${ms.toFixed(0)} ms`)
    expect(ms).toBeLessThan(3_000)

    const { prisma } = ctx
    const sheets = await prisma.importSheet.findMany({
      where: { file: { importId: detail.importId } },
      include: { _count: { select: { rows: true, columnMaps: true } } },
    })
    const bySheet = Object.fromEntries(
      sheets.map((s) => [s.sheetName, [s._count.rows, s._count.columnMaps, s.mappingConfirmed]]),
    )
    expect(bySheet).toMatchObject({
      APP: [340, 3, true],
      DEC: [110, 3, true],
      CHB: [3, 3, true],
      REF: [7, 3, true],
      RDR: [3, 3, true],
      RR: [320, 3, true],
      'Other Fees': [0, 3, true],
      Settings: [0, 0, true],
    })
    const first = await prisma.importRow.findFirstOrThrow({
      where: { sheetId: sheetNamed(detail, 'APP').sheetId, rowNo: 2 },
      include: { transaction: true },
    })
    expect(first).toMatchObject({
      transactionIdRaw: FIRST_APP_ID,
      gatewayId: 1,
      statusId: 2,
      matchResult: 'matched',
      detailJson: null,
    })
    expect(first.transaction?.sourceTransactionId).toBe(FIRST_APP_ID)
    expect(JSON.parse(first.rawData)).toEqual({ ID: FIRST_APP_ID, Amount: '16.22', Currency: 'USD' })
    const rr = await prisma.importRow.findFirstOrThrow({
      where: { sheetId: sheetNamed(detail, 'RR').sheetId, matchResult: 'matched' },
      include: { transaction: true },
    })
    expect(rr.statusId).toBe(rr.transaction?.statusId)
    const ignored = await rows(detail.importId, '?match=ignored')
    expect(ignored.items.map((r) => [r.sheetName, r.rowNo, r.reason, r.transactionIdRaw])).toEqual([
      ['CHB', 4, 'empty_id', ''],
      ['RDR', 4, 'empty_id', ''],
      ['REF', 8, 'empty_id', ''],
    ])
    expect(detail.channels?.map((c) => [c.name, c.assignment])).toEqual([
      ['RAM-01', 'assigned'],
      ['RAM-02', 'assigned'],
      ['RAM-07', 'unassigned'],
    ])
    const list = await call(
      'GET',
      `/accounts/${accountIds['ProviderA-USD']}/imports?status=analyzed`,
      undefined,
      'viewer',
    )
    expect(list.json()).toContainEqual(
      expect.objectContaining({ importId: detail.importId, rowsTotal: 783, rowsMatched: 780 }),
    )
  })

  it('batch-blocked: the RAM-01 row matches through the shared gateway and the channel belongs to ProviderA-USD', async () => {
    const { detail } = await analyzed(accountIds['ProviderB-Main'] as string, [samplePart(BATCH_BLOCKED)])

    expect(detail.channels?.find((c) => c.name === 'RAM-01')).toMatchObject({
      assignment: 'assigned_to_other_account',
      otherAccount: { accountId: accountIds['ProviderA-USD'], name: 'ProviderA-USD' },
      providerId: 101,
      rowCount: 1,
    })
  })

  it('legacy-provider: CHB 2 keeps its status and marks excludeAmount; Failed resolves to Declined', async () => {
    const { detail } = await analyzed(accountIds['ProviderC-Alt'] as string, [samplePart(LEGACY)])

    const all = await rows(detail.importId, '?pageSize=500')
    const cb = all.items.find((r) => r.sheetName === 'CB')
    expect(cb).toMatchObject({
      statusRaw: 'CHB 2',
      statusId: 4,
      statusName: 'Chargeback',
      excludeAmount: true,
      gatewayId: 2,
    })
    expect(
      all.items.filter((r) => r.sheetName === 'Fail').every((r) => r.statusId === 3 && r.warnings.length === 0),
    ).toBe(true)
  })
})

describe('an ambiguous row and its resolution (issue #5, criterion 6; temporary gateway 9001)', () => {
  // The imports of this group: they reference transaction 9001, so they leave before the fixture.
  const fixtureImports: string[] = []

  // The fixture lives only inside this group: its import first (it references transaction 9001), then the fixture.
  afterAll(async () => {
    await removeImports(fixtureImports)
    await removeGatewayFixture()
  })

  beforeAll(async () => {
    const { prisma } = ctx
    await prisma.gateway.create({ data: { gatewayId: GATEWAY_TEST, name: 'Gateway Test', idFormat: 'numeric' } })
    await prisma.channel.create({
      data: {
        channelId: CHANNEL_TEST,
        gatewayId: GATEWAY_TEST,
        providerId: 101,
        name: 'RAM-T1',
        settlementTermDays: 14,
        rollingReservePct: '0.100000',
        rollingReserveDays: 180,
      },
    })
    await prisma.accountChannel.create({
      data: {
        accountId: accountIds['ProviderA-USD'] as string,
        channelId: CHANNEL_TEST,
        isPrimary: true,
        assignedAt: new Date(),
        assignedByUserId: analystId,
      },
    })
    await prisma.transaction.create({
      data: {
        sourceTransactionId: FIRST_APP_ID,
        gatewayId: GATEWAY_TEST,
        merchantId: 1,
        providerId: 101,
        channelId: CHANNEL_TEST,
        amount: '16.2200',
        currency: 'USD',
        statusId: 2,
        transactionDate: new Date('2026-10-01T00:00:00.000Z'),
        appliedReservePct: '0.100000',
      },
    })
  })

  it('analyzes batch-clean with one ambiguous row, resolves it with the chosen gateway and records it in AuditLog', async () => {
    const { detail } = await analyzed(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])
    fixtureImports.push(detail.importId)
    expect(detail.analysis?.rows).toEqual({ total: 783, matched: 779, unmatched: 0, ambiguous: 1, ignored: 3 })
    const ambiguous = await rows(detail.importId, '?match=ambiguous')
    const row = ambiguous.items[0]
    expect(row).toMatchObject({ sheetName: 'APP', rowNo: 2, transactionIdRaw: FIRST_APP_ID, transactionId: null })
    expect(row?.candidates.map((c) => c.gatewayId)).toEqual([1, GATEWAY_TEST])
    const sheetId = sheetNamed(detail, 'APP').sheetId

    const wrong = await call('PATCH', `/imports/${detail.importId}/rows/${sheetId}/2`, { gatewayId: 2 })
    expect(wrong.statusCode).toBe(400)
    expect(wrong.json()).toMatchObject({ code: 'validation_error', details: { gatewayId: 2 } })

    const res = await call('PATCH', `/imports/${detail.importId}/rows/${sheetId}/2`, { gatewayId: GATEWAY_TEST })
    expect(res.statusCode).toBe(200)
    const resolved = ImportRowItem.parse(res.json())
    expect(resolved).toMatchObject({
      matchResult: 'matched',
      gatewayId: GATEWAY_TEST,
      transaction: { channelName: 'RAM-T1' },
    })
    const after = ImportDetail.parse((await call('GET', `/imports/${detail.importId}`)).json())
    expect(after).toMatchObject({ rowsMatched: 780 })
    expect(after.analysis?.rows).toMatchObject({ matched: 780, ambiguous: 0 })
    expect(after.channels?.find((c) => c.channelId === CHANNEL_TEST)).toMatchObject({
      name: 'RAM-T1',
      assignment: 'assigned',
    })
    const audit = await ctx.prisma.auditLog.findMany({
      where: { action: 'import.row.resolve_gateway', entityId: `${sheetId}:2` },
    })
    expect(audit).toHaveLength(1)
    expect(audit[0]).toMatchObject({ userId: analystId, entityType: 'ImportRow' })
    expect(JSON.parse(audit[0]?.detailJson ?? '{}')).toMatchObject({
      importId: detail.importId,
      gatewayId: GATEWAY_TEST,
    })

    const again = await call('PATCH', `/imports/${detail.importId}/rows/${sheetId}/2`, { gatewayId: GATEWAY_TEST })
    expect(again.statusCode).toBe(409)
    expect(again.json().code).toBe('row_not_ambiguous')
    const viewer = await call('PATCH', `/imports/${detail.importId}/rows/${sheetId}/3`, { gatewayId: 1 }, 'viewer')
    expect(viewer.statusCode).toBe(403)
  })

  it('two PATCH at once on the same ambiguous row: one 200, one 409 row_not_ambiguous, rowsMatched +1, one audit entry', async () => {
    const { detail } = await analyzed(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])
    fixtureImports.push(detail.importId)
    expect(detail.rowsMatched).toBe(779)
    const sheetId = sheetNamed(detail, 'APP').sheetId
    const url = `/imports/${detail.importId}/rows/${sheetId}/2`

    const [first, second] = await Promise.all([
      call('PATCH', url, { gatewayId: GATEWAY_TEST }),
      call('PATCH', url, { gatewayId: 1 }),
    ])

    expect([first.statusCode, second.statusCode].sort((a, b) => a - b)).toEqual([200, 409])
    const rejected = first.statusCode === 409 ? first : second
    expect(rejected.json()).toMatchObject({ code: 'row_not_ambiguous', details: { matchResult: 'matched' } })
    const after = ImportDetail.parse((await call('GET', `/imports/${detail.importId}`)).json())
    expect(after.rowsMatched).toBe(780)
    expect(after.analysis?.rows).toMatchObject({ matched: 780, ambiguous: 0 })
    expect(
      await ctx.prisma.auditLog.count({ where: { action: 'import.row.resolve_gateway', entityId: `${sheetId}:2` } }),
    ).toBe(1)
  })
})

describe('an account without channels (decision 1 of the review; temporary account ZZ-NoChannels)', () => {
  // The account lives only inside this group, with the imports it holds.
  beforeAll(async () => {
    await ctx.prisma.account.create({
      data: {
        accountId: NO_CHANNELS_ACCOUNT_ID,
        providerId: 101,
        name: NO_CHANNELS_ACCOUNT_NAME,
        chargebackReservePolicy: 'hold_until_term',
        createdByUserId: analystId,
      },
    })
  })

  afterAll(async () => removeNoChannelsAccount())

  it("matches through the gateways of its provider and reports RAM-01 and RAM-02 as another account's", async () => {
    const { detail } = await analyzed(NO_CHANNELS_ACCOUNT_ID, [samplePart(BATCH_CLEAN)])

    expect(detail.analysis?.rows).toMatchObject({ matched: 780, unmatched: 0 })
    expect(detail.channels?.map((c) => [c.name, c.assignment, c.otherAccount?.name ?? null])).toEqual([
      ['RAM-01', 'assigned_to_other_account', 'ProviderA-USD'],
      ['RAM-02', 'assigned_to_other_account', 'ProviderA-USD'],
      ['RAM-07', 'unassigned', null],
    ])
  })
})

describe('what the analysis refuses (issue #5, criteria 1 and 4)', () => {
  it('422 mapping_incomplete when a transactions sheet has no transactionId: the import stays mapped without rows', async () => {
    const detail = await mapped(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)], (body, before) => {
      const app = body.sheets.find((s) => s.sheetId === sheetNamed(before, 'APP').sheetId)
      if (app) app.columns = app.columns.filter((c) => c.targetField !== 'transactionId')
    })
    expect(detail.readiness).toMatchObject({
      canAnalyze: false,
      missing: [expect.objectContaining({ sheetName: 'APP', field: 'transactionId' })],
    })

    const res = await call('POST', `/imports/${detail.importId}/analyze`)

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({
      code: 'mapping_incomplete',
      details: { missing: [{ sheetName: 'APP', field: 'transactionId' }] },
    })
    const after = ImportDetail.parse((await call('GET', `/imports/${detail.importId}`)).json())
    expect(after).toMatchObject({ status: 'mapped', analyzedAt: null, analysis: null })
    expect(await ctx.prisma.importRow.count({ where: { sheet: { file: { importId: detail.importId } } } })).toBe(0)
  })

  it('409 import_not_mapped before the confirmation, and 409 import_not_editable for files once analyzed', async () => {
    const uploadedOne = await uploaded(accountIds['ProviderA-USD'] as string, [samplePart(PART1)])
    const early = await call('POST', `/imports/${uploadedOne.importId}/analyze`)
    expect(early.statusCode).toBe(409)
    expect(early.json()).toMatchObject({ code: 'import_not_mapped', details: { status: 'uploaded' } })

    const { detail } = await analyzed(accountIds['ProviderA-USD'] as string, [samplePart(PART1)])
    const { payload, contentType } = await multipart([samplePart(PART2)])
    const add = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/imports/${detail.importId}/files`,
      headers: { authorization: `Bearer ${tokens.analyst}`, 'content-type': contentType },
      payload,
    })
    expect(add.statusCode).toBe(409)
    expect(add.json()).toMatchObject({ code: 'import_not_editable', details: { status: 'analyzed' } })
    const remove = await call('DELETE', `/imports/${detail.importId}/files/${detail.files[0]?.fileId}`)
    expect(remove.statusCode).toBe(409)
  })

  it('a numeric id cell that lost precision is unmatched with reason lossy_numeric_id, never looked up', async () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          rows: [
            ['ID', 'Amount', 'Currency'],
            [{ v: '12345678901234567' }, { v: '10' }, 'USD'],
            [{ v: '1.2345678901234567E16' }, { v: '10' }, 'USD'],
            [FIRST_APP_ID, { v: '16.22' }, 'USD'],
          ],
        },
      ],
    })

    const { detail } = await analyzed(accountIds['ProviderA-USD'] as string, [{ name: 'lossy.xlsx', bytes }])

    expect(detail.analysis?.rows).toEqual({ total: 3, matched: 1, unmatched: 2, ambiguous: 0, ignored: 0 })
    expect(detail.analysis?.warnings.lossy_numeric_id).toBe(2)
    const unmatched = await rows(detail.importId, '?match=unmatched')
    expect(unmatched.items.map((r) => [r.transactionIdRaw, r.reason, r.transactionId])).toEqual([
      ['12345678901234567', 'lossy_numeric_id', null],
      ['1.2345678901234567E16', 'lossy_numeric_id', null],
    ])
  })

  it('422 import_too_large one row over the per-import cap, without reading rows (design D1)', async () => {
    const ids: string[] = []
    for (let i = 0; i < ROW_CAP + 1; i++) ids.push(String(900_000_000_000_000 + i))
    const data: CellInput[][] = [
      ['ID', 'Amount', 'Currency'],
      ...ids.map((id) => [id, { v: '1' }, 'USD'] as CellInput[]),
    ]
    const bytes = buildXlsx({ sheets: [{ name: 'APP', rows: data }] })
    const detail = await mapped(accountIds['ProviderA-USD'] as string, [{ name: 'too-large.xlsx', bytes }])
    expect(sheetNamed(detail, 'APP').rowCount).toBe(ROW_CAP + 1)

    const res = await call('POST', `/imports/${detail.importId}/analyze`)

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ code: 'import_too_large', details: { rows: ROW_CAP + 1, limit: ROW_CAP } })
    expect((await call('GET', `/imports/${detail.importId}`)).json()).toMatchObject({
      status: 'mapped',
      analysis: null,
    })
    expect(await ctx.prisma.importRow.count({ where: { sheet: { file: { importId: detail.importId } } } })).toBe(0)
  }, 120_000)
})

describe('cancel (HU1 CA8, HU2 CA8) and scope', () => {
  it('cancels an analyzed import keeping everything, records it, refuses a second cancel and admits the file again', async () => {
    const { detail } = await analyzed(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])

    const res = await call('POST', `/imports/${detail.importId}/cancel`)

    expect(res.statusCode).toBe(200)
    const cancelled = ImportDetail.parse(res.json())
    expect(cancelled).toMatchObject({
      status: 'cancelled',
      analysis: detail.analysis,
      channels: detail.channels,
      batchFees: detail.batchFees,
    })
    expect(cancelled.files).toEqual(detail.files)
    expect(
      readFileSync(path.join(uploadDir, `imports/${detail.importId}/${detail.files[0]?.fileId}.xlsx`)),
    ).toHaveLength(31510)
    expect(await ctx.prisma.importRow.count({ where: { sheet: { file: { importId: detail.importId } } } })).toBe(783)
    expect((await rows(detail.importId, '?pageSize=1')).total).toBe(783)
    const audit = await ctx.prisma.auditLog.findMany({ where: { action: 'import.cancel', entityId: detail.importId } })
    expect(audit).toHaveLength(1)
    expect(JSON.parse(audit[0]?.detailJson ?? '{}')).toEqual({ previousStatus: 'analyzed' })

    const again = await call('POST', `/imports/${detail.importId}/cancel`)
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ code: 'import_not_cancellable', details: { status: 'cancelled' } })

    const reupload = await upload(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])
    expect(reupload.statusCode).toBe(201)
    expect(reupload.json().importId).not.toBe(detail.importId)
  })

  it('viewer gets 403 on every write and 404 on the rows of an import outside the scope, identical to an unknown id', async () => {
    const own = await uploaded(accountIds['ProviderA-USD'] as string, [samplePart(PART1)])
    for (const [method, url, body] of [
      ['PUT', `/imports/${own.importId}/mapping`, confirmProposal(own)],
      ['POST', `/imports/${own.importId}/analyze`, undefined],
      ['PATCH', `/imports/${own.importId}/rows/${sheetNamed(own, 'APP').sheetId}/2`, { gatewayId: 1 }],
      ['POST', `/imports/${own.importId}/cancel`, undefined],
    ] as [Method, string, object | undefined][]) {
      const res = await call(method, url, body, 'viewer')
      expect(res.statusCode, `${method} ${url}`).toBe(403)
      expect(res.json().code).toBe('forbidden')
    }

    const foreign = await uploaded(accountIds['ProviderC-Alt'] as string, [samplePart(LEGACY)])
    const outside = await call('GET', `/imports/${foreign.importId}/rows`, undefined, 'viewer')
    const unknown = await call('GET', `/imports/${UNKNOWN_UUID}/rows`, undefined, 'viewer')
    expect(outside.statusCode).toBe(404)
    expect(outside.body).toBe(unknown.body)
  })
})

describe('a template saved by Excel desktop (data/samples/excel-real), confirmed and analyzed', () => {
  it('ends analyzed: IDs as text, the one numeric ID that lost precision is unmatched with its reason', async () => {
    const { detail } = await analyzed(accountIds['ProviderA-USD'] as string, [
      samplePart('excel-real/excel-real-sample.xlsx'),
    ])

    expect(detail.status).toBe('analyzed')
    const transactionRows = detail.files
      .flatMap((f) => f.sheets)
      .filter((s) => s.mapping?.kind === 'transactions')
      .reduce((sum, s) => sum + s.rowCount, 0)
    expect(detail.analysis?.rows.total).toBe(transactionRows)
    expect(detail.analysis?.warnings.lossy_numeric_id).toBe(1)
    const unmatched = await rows(detail.importId, '?match=unmatched')
    const lossy = unmatched.items.find((r) => r.reason === 'lossy_numeric_id')
    expect(lossy).toBeDefined()
    expect(lossy?.transactionIdRaw).toMatch(/^\d{16,}$|E\+?\d+$/)
    const first = (await rows(detail.importId, '?pageSize=1&match=matched')).items[0]
    expect(first?.transactionIdRaw).toBe('403066894472190')
  })
})

// ───────────────────────── verify follow-ups (W2, W3) ─────────────────────────

describe('two overlapping analyses (spec: import, D1 claim)', () => {
  it('one answers 200 and the other 409 import_not_mapped; the database holds exactly rowsTotal rows', async () => {
    const detail = await mapped(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])

    const [first, second] = await Promise.all([
      call('POST', `/imports/${detail.importId}/analyze`),
      call('POST', `/imports/${detail.importId}/analyze`),
    ])

    const statuses = [first.statusCode, second.statusCode].sort((a, b) => a - b)
    expect(statuses).toEqual([200, 409])
    const rejected = first.statusCode === 409 ? first : second
    const accepted = first.statusCode === 200 ? first : second
    expect(rejected.json()).toMatchObject({ code: 'import_not_mapped', details: { status: 'analyzed' } })
    const analyzedDetail = ImportDetail.parse(accepted.json())
    expect(analyzedDetail).toMatchObject({ status: 'analyzed', rowsTotal: 783 })
    expect(await ctx.prisma.importRow.count({ where: { sheet: { file: { importId: detail.importId } } } })).toBe(783)
    const after = ImportDetail.parse((await call('GET', `/imports/${detail.importId}`)).json())
    expect(after.analysis?.rows).toEqual({ total: 783, matched: 780, unmatched: 0, ambiguous: 0, ignored: 3 })
  })
})

describe('twenty thousand rows end to end (spec: import, Capacidad de análisis)', () => {
  it('a generated 20 000-row workbook is uploaded, confirmed and analyzed in under 20 s with every row unmatched', async () => {
    const ids: string[] = []
    for (let i = 0; i < 20_000; i++) ids.push(String(700_000_000_000_000 + i))
    const data: CellInput[][] = [
      ['ID', 'Amount', 'Currency'],
      ...ids.map((id) => [id, { v: '1' }, 'USD'] as CellInput[]),
    ]
    const bytes = buildXlsx({ sheets: [{ name: 'APP', rows: data }] })

    const { detail, ms } = await analyzed(accountIds['ProviderA-USD'] as string, [
      { name: 'twenty-thousand.xlsx', bytes },
    ])
    console.info(`[D1] analyze 20 000 rows end to end: ${ms.toFixed(0)} ms`)

    expect(detail.analysis?.rows).toEqual({ total: 20_000, matched: 0, unmatched: 20_000, ambiguous: 0, ignored: 0 })
    expect(await ctx.prisma.importRow.count({ where: { sheet: { file: { importId: detail.importId } } } })).toBe(20_000)
    expect(ms).toBeLessThan(20_000)
  }, 120_000)

  it.skipIf(!BENCH)(
    'a generated 100 000-row workbook (the per-import cap) is uploaded, confirmed and analyzed end to end in under 90 s — RECON_BENCH=1 only',
    async () => {
      const ids: string[] = []
      for (let i = 0; i < ROW_CAP; i++) ids.push(String(800_000_000_000_000 + i))
      const data: CellInput[][] = [
        ['ID', 'Amount', 'Currency'],
        ...ids.map((id) => [id, { v: '1' }, 'USD'] as CellInput[]),
      ]
      const bytes = buildXlsx({ sheets: [{ name: 'APP', rows: data }] })

      const { detail, ms } = await analyzed(accountIds['ProviderA-USD'] as string, [
        { name: 'hundred-thousand.xlsx', bytes },
      ])
      console.info(`[D1] analyze 100 000 rows end to end: ${ms.toFixed(0)} ms`)

      expect(detail.analysis?.rows).toEqual({
        total: ROW_CAP,
        matched: 0,
        unmatched: ROW_CAP,
        ambiguous: 0,
        ignored: 0,
      })
      expect(await ctx.prisma.importRow.count({ where: { sheet: { file: { importId: detail.importId } } } })).toBe(
        ROW_CAP,
      )
      expect(ms).toBeLessThan(90_000)
    },
    600_000,
  )
})

// ───────────────────────── review of the PR: guarded writes (H1) ─────────────────────────

/** Every merchant: the analyst's scope is "all". */
async function allMerchants(): Promise<Scope> {
  return {
    merchantIds: (await ctx.prisma.merchant.findMany({ select: { merchantId: true } })).map((m) => m.merchantId),
  }
}

/**
 * The real service over the real adapters, whose import repository runs `beforeWrite` right before each write:
 * the window between what the service read and what it writes, where a concurrent request can commit.
 */
function serviceWithWindow(beforeWrite: () => Promise<void>): ImportService {
  const repository = new PrismaImportRepository(ctx.prisma)
  const windowed = Object.assign(Object.create(repository) as PrismaImportRepository, {
    confirmMapping: async (...args: Parameters<PrismaImportRepository['confirmMapping']>) => {
      await beforeWrite()
      return repository.confirmMapping(...args)
    },
    removeFile: async (...args: Parameters<PrismaImportRepository['removeFile']>) => {
      await beforeWrite()
      return repository.removeFile(...args)
    },
  })
  return new ImportService({
    imports: windowed,
    files: new FsFileStore(uploadDir),
    reader: new XlsxWorkbookReader({ log: ctx.app.log }),
    rules: new PrismaMatchingRulesRepository(ctx.prisma),
    ids: randomUUID,
    log: ctx.app.log,
    rows: new PrismaImportRowRepository(ctx.prisma),
    transactions: new PrismaTransactionLookup(ctx.prisma),
    accounts: new PrismaAccountContext(ctx.prisma),
    feeTypes: new PrismaFeeTypeCatalog(ctx.prisma),
    audit: new PrismaAuditLogger(ctx.prisma),
    limits: { maxRowsPerImport: DEFAULT_READ_LIMITS.maxRowsPerImport },
  })
}

async function rowCount(importId: string): Promise<number> {
  return ctx.prisma.importRow.count({ where: { sheet: { file: { importId } } } })
}

describe('writes that read the import before a concurrent request commits (spec: import, D2)', () => {
  it('a PUT mapping that read mapped is refused with 409 once analyze committed; the import stays analyzed with its rows', async () => {
    const detail = await mapped(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])
    const body = confirmProposal(detail)
    const service = serviceWithWindow(async () => {
      const res = await call('POST', `/imports/${detail.importId}/analyze`)
      expect(res.statusCode, res.body).toBe(200)
    })

    const error = await service.confirmMapping(await allMerchants(), detail.importId, body).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ImportNotEditableError)
    expect((error as ImportNotEditableError).details).toEqual({ status: 'analyzed' })
    const after = ImportDetail.parse((await call('GET', `/imports/${detail.importId}`)).json())
    expect(after).toMatchObject({ status: 'analyzed', rowsTotal: 783 })
    expect(after.analysis?.rows).toEqual({ total: 783, matched: 780, unmatched: 0, ambiguous: 0, ignored: 3 })
    expect(await rowCount(detail.importId)).toBe(783)
  })

  it('a PUT mapping that read mapped is refused with 409 once cancel committed; the import stays cancelled', async () => {
    const detail = await mapped(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])
    const service = serviceWithWindow(async () => {
      const res = await call('POST', `/imports/${detail.importId}/cancel`)
      expect(res.statusCode, res.body).toBe(200)
    })

    const error = await service
      .confirmMapping(await allMerchants(), detail.importId, confirmProposal(detail))
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ImportNotEditableError)
    expect((error as ImportNotEditableError).details).toEqual({ status: 'cancelled' })
    expect((await call('GET', `/imports/${detail.importId}`)).json()).toMatchObject({ status: 'cancelled' })
  })

  it('a file removal that read mapped is refused with 409 once analyze committed; no row of the analysis is lost', async () => {
    const detail = await mapped(accountIds['ProviderA-USD'] as string, [samplePart(PART1), samplePart(PART2)])
    const service = serviceWithWindow(async () => {
      const res = await call('POST', `/imports/${detail.importId}/analyze`)
      expect(res.statusCode, res.body).toBe(200)
    })
    const fileId = detail.files[1]?.fileId as string

    const error = await service.removeFile(await allMerchants(), detail.importId, fileId).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ImportNotEditableError)
    const after = ImportDetail.parse((await call('GET', `/imports/${detail.importId}`)).json())
    expect(after.status).toBe('analyzed')
    expect(after.files).toHaveLength(2)
    expect(await rowCount(detail.importId)).toBe(after.rowsTotal)
  })

  it('a cancel that read analyzed still cancels, and a second cancel is refused by the guarded write', async () => {
    const { detail } = await analyzed(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])
    const [first, second] = await Promise.all([
      call('POST', `/imports/${detail.importId}/cancel`),
      call('POST', `/imports/${detail.importId}/cancel`),
    ])

    expect([first.statusCode, second.statusCode].sort((a, b) => a - b)).toEqual([200, 409])
    const rejected = first.statusCode === 409 ? first : second
    expect(rejected.json()).toMatchObject({ code: 'import_not_cancellable', details: { status: 'cancelled' } })
    expect(await ctx.prisma.auditLog.count({ where: { action: 'import.cancel', entityId: detail.importId } })).toBe(1)
  })
})

describe('PUT mapping bodies the database would refuse (review of the PR, M2)', () => {
  it('400 validation_error, not 500, for a source column mapped twice and for an unknown status; nothing is written', async () => {
    const detail = await uploaded(accountIds['ProviderA-USD'] as string, [samplePart(BATCH_CLEAN)])
    const appId = sheetNamed(detail, 'APP').sheetId
    const twice = confirmProposal(detail)
    twice.sheets.find((s) => s.sheetId === appId)?.columns.push({ sourceColumn: 'ID', targetField: 'orderId' })
    const unknownStatus = confirmProposal(detail)
    const app = unknownStatus.sheets.find((s) => s.sheetId === appId)
    if (app) app.statusId = 999

    const repeated = await call('PUT', `/imports/${detail.importId}/mapping`, twice)
    const status = await call('PUT', `/imports/${detail.importId}/mapping`, unknownStatus)

    expect(repeated.statusCode, repeated.body).toBe(400)
    expect(repeated.json()).toMatchObject({
      code: 'validation_error',
      details: { sheetName: 'APP', sourceColumn: 'ID' },
    })
    expect(status.statusCode, status.body).toBe(400)
    expect(status.json()).toMatchObject({
      code: 'validation_error',
      details: { sheetName: 'APP', field: 'statusId', statusId: 999 },
    })
    const after = ImportDetail.parse((await call('GET', `/imports/${detail.importId}`)).json())
    expect(after.status).toBe('uploaded')
    expect(after.files[0]?.sheets.every((s) => !s.mappingConfirmed)).toBe(true)
  })
})

describe('a transaction of another merchant on a shared gateway (review of the PR, M3; temporary channel 9002)', () => {
  // Gateway 1 is shared: channel 9002 belongs to provider 201 (merchant 2), primary account ProviderC-USD. The import
  // of ProviderA-USD (merchant 1) cross-matches its one row with the merchant-2 transaction: the cross-match does not
  // change; what a caller outside merchant 2 reads does.
  const fixtureImports: string[] = []

  beforeAll(async () => {
    const { prisma } = ctx
    await prisma.channel.create({
      data: {
        channelId: OTHER_MERCHANT_CHANNEL,
        gatewayId: 1,
        providerId: 201,
        name: 'RAM-X2',
        settlementTermDays: 7,
        rollingReservePct: '0.000000',
        rollingReserveDays: 0,
      },
    })
    await prisma.accountChannel.create({
      data: {
        accountId: accountIds['ProviderC-USD'] as string,
        channelId: OTHER_MERCHANT_CHANNEL,
        isPrimary: true,
        assignedAt: new Date(),
        assignedByUserId: analystId,
      },
    })
    await prisma.transaction.create({
      data: {
        sourceTransactionId: OTHER_MERCHANT_SOURCE_ID,
        gatewayId: 1,
        merchantId: 2,
        providerId: 201,
        channelId: OTHER_MERCHANT_CHANNEL,
        amount: '42.0000',
        currency: 'USD',
        statusId: 2,
        transactionDate: new Date('2026-10-01T00:00:00.000Z'),
        appliedReservePct: '0.000000',
      },
    })
  })

  afterAll(async () => {
    await removeImports(fixtureImports)
    await removeOtherMerchantFixture()
  })

  it('the analyst of both merchants sees the other account and the transaction; the viewer of merchant 1 sees neither', async () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          rows: [
            ['ID', 'Amount', 'Currency'],
            [OTHER_MERCHANT_SOURCE_ID, { v: '42' }, 'USD'],
          ],
        },
      ],
    })
    const { detail } = await analyzed(accountIds['ProviderA-USD'] as string, [{ name: 'other-merchant.xlsx', bytes }])
    fixtureImports.push(detail.importId)
    expect(detail.analysis?.rows).toMatchObject({ total: 1, matched: 1 })

    // Analyst, scope merchants 1 and 2: everything as before.
    expect(detail.channels).toEqual([
      expect.objectContaining({
        channelId: OTHER_MERCHANT_CHANNEL,
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: accountIds['ProviderC-USD'], name: 'ProviderC-USD' },
      }),
    ])
    const own = await rows(detail.importId)
    expect(own.items[0]).toMatchObject({
      matchResult: 'matched',
      transaction: { channelName: 'RAM-X2', amount: '42.0000' },
    })
    expect(own.items[0]?.warnings).not.toContain('out_of_scope_transaction')

    // Viewer, scope merchant 1 only: same assignment, the other account and the transaction hidden.
    const viewerDetail = await call('GET', `/imports/${detail.importId}`, undefined, 'viewer')
    expect(viewerDetail.statusCode).toBe(200)
    const seen = ImportDetail.parse(viewerDetail.json())
    expect(seen.channels).toEqual([
      expect.objectContaining({
        channelId: OTHER_MERCHANT_CHANNEL,
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: null, name: null, outOfScope: true },
      }),
    ])
    const viewerRows = await call('GET', `/imports/${detail.importId}/rows`, undefined, 'viewer')
    expect(viewerRows.statusCode).toBe(200)
    const item = ImportRowsPage.parse(viewerRows.json()).items[0]
    expect(item).toMatchObject({ matchResult: 'matched', transaction: null })
    expect(item?.transactionId).not.toBeNull()
    expect(item?.warnings).toContain('out_of_scope_transaction')
    expect(JSON.stringify(viewerRows.json())).not.toContain('RAM-X2')
    expect(seen.analysis).toEqual(detail.analysis)
  })
})
