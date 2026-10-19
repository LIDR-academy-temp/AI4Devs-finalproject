import {
  type ImportDetail,
  ImportDetail as ImportDetailSchema,
  ImportRowItem,
  type MappingConfirmation,
} from '@recon/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import { InMemoryAuditLogger } from '../../../test-support/in-memory-audit-logger.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { MatchingRulesRepository } from '../../matching/application/ports.js'
import type { MatchingRules } from '../../matching/domain/rules.js'
import {
  CandidateNotFoundError,
  ImportNotCancellableError,
  ImportNotEditableError,
  ImportNotMappedError,
  ImportTooLargeError,
  MappingIncompleteError,
  MappingShapeError,
  RowNotAmbiguousError,
} from '../domain/errors.js'
import { buildXlsx } from '../infrastructure/xlsx/test-support.js'
import {
  ACCOUNT_IDS,
  FakeWorkbookReader,
  InMemoryFileStore,
  InMemoryImportRepository,
  InMemoryMatchingRulesRepository,
  NO_CHANNELS_ACCOUNT_ID,
  NO_PROVIDER_CHANNELS_ACCOUNT_ID,
  RULES_FOR_PROVIDER_A,
  SAMPLE_FILES,
  type SampleFile,
  sequentialIds,
} from './__fakes__/in-memory.js'
import {
  InMemoryAccountContext,
  InMemoryFeeTypeCatalog,
  InMemoryImportRowRepository,
  InMemoryTransactionLookup,
} from './__fakes__/in-memory-analysis.js'
import { ImportService } from './import-service.js'
import type { StagedUpload } from './ports.js'

// The analysis use cases over the doubles (design D6–D13), with the transactions of the synthetic world so that the
// samples give the exact counts of expected.json: spec "Confirmación del pareo", "Análisis del import",
// "Precondiciones del análisis", "Límite de filas por import", "Filas del import", "Resolución de una fila ambigua",
// "Cancelación del import", "Aviso de canales", "Fees por batch prellenados…", "Resumen del análisis".
const ANALYST: Scope = { merchantIds: [1, 2] }
const VIEWER: Scope = { merchantIds: [1] }
const ANALYST_ID = 2
const A_USD = ACCOUNT_IDS['ProviderA-USD']
const B_MAIN = ACCOUNT_IDS['ProviderB-Main']
const C_ALT = ACCOUNT_IDS['ProviderC-Alt']
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
const ZERO_WARNINGS = {
  negative_amount: 0,
  non_usd_currency: 0,
  amount_unparsed: 0,
  currency_invalid: 0,
  id_length: 0,
  lossy_numeric_id: 0,
  status_unresolved: 0,
  status_differs_from_sheet: 0,
  cycle_mismatch: 0,
}

let imports: InMemoryImportRepository
let files: InMemoryFileStore
let reader: FakeWorkbookReader
let transactions: InMemoryTransactionLookup
let rows: InMemoryImportRowRepository
let accounts: InMemoryAccountContext
let audit: InMemoryAuditLogger
let service: ImportService
const log = { error: vi.fn(), warn: vi.fn() }

function build(
  limits = { maxRowsPerImport: 100_000 },
  rules: MatchingRulesRepository = new InMemoryMatchingRulesRepository(),
): ImportService {
  return new ImportService({
    imports,
    files,
    reader,
    rules,
    ids: sequentialIds(),
    log,
    rows,
    transactions,
    accounts,
    feeTypes: new InMemoryFeeTypeCatalog(),
    audit,
    limits,
  })
}

beforeEach(() => {
  imports = new InMemoryImportRepository()
  files = new InMemoryFileStore()
  reader = new FakeWorkbookReader()
  transactions = new InMemoryTransactionLookup()
  rows = new InMemoryImportRowRepository(imports, transactions)
  accounts = new InMemoryAccountContext()
  audit = new InMemoryAuditLogger()
  service = build()
  log.error.mockClear()
  log.warn.mockClear()
})

async function upload(sample: SampleFile): Promise<StagedUpload> {
  return { fileName: sample.fileName, ...(await files.stageBytes(sample.bytes)) }
}

async function uploaded(accountId: string, samples: SampleFile[]): Promise<ImportDetail> {
  const staged = await Promise.all(samples.map(upload))
  return service.createImport(ANALYST, ANALYST_ID, accountId, staged)
}

/** The proposal as the detail returned it, turned into a confirmation body. */
function confirmation(detail: ImportDetail): MappingConfirmation {
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

async function mapped(accountId: string, samples: SampleFile[]): Promise<ImportDetail> {
  const detail = await uploaded(accountId, samples)
  return service.confirmMapping(ANALYST, detail.importId, confirmation(detail))
}

async function analyzed(accountId: string, samples: SampleFile[]): Promise<ImportDetail> {
  const detail = await mapped(accountId, samples)
  return service.analyze(ANALYST, detail.importId)
}

const sheetNamed = (detail: ImportDetail, name: string, fileIndex = 0) => {
  const found = detail.files[fileIndex]?.sheets.find((s) => s.sheetName === name)
  if (!found) throw new Error(`sheet ${name} missing`)
  return found
}

async function caught<E>(promise: Promise<unknown>, type: new (...args: never[]) => E): Promise<E> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(type)
  return error as E
}

describe('confirmMapping', () => {
  it('stores the confirmed mapping of every sheet, moves the import to mapped and keeps the proposal as reference', async () => {
    const detail = await uploaded(A_USD, [SAMPLE_FILES.batchClean])

    const confirmed = await service.confirmMapping(ANALYST, detail.importId, confirmation(detail))

    expect(ImportDetailSchema.safeParse(confirmed).success).toBe(true)
    expect(confirmed.status).toBe('mapped')
    expect(confirmed.files[0]?.sheets.every((s) => s.mappingConfirmed)).toBe(true)
    expect(sheetNamed(confirmed, 'APP').mapping).toEqual({
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
      statusName: 'Successful',
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Amount', targetField: 'amount' },
        { sourceColumn: 'Currency', targetField: 'currency' },
      ],
    })
    expect(sheetNamed(confirmed, 'Other Fees').mapping?.columns).toHaveLength(3)
    expect(sheetNamed(confirmed, 'RR').mapping).toMatchObject({ cycle: 'R', statusId: null, statusName: null })
    expect(sheetNamed(confirmed, 'APP').proposed.source).toBe('global')
    expect(confirmed.readiness).toMatchObject({ canAnalyze: true, missing: [] })
    expect(imports.stored(detail.importId).files[0]?.sheets[0]?.columnMaps).toHaveLength(3)
  })

  it('a second confirmation replaces the first (APP without Currency)', async () => {
    const detail = await mapped(A_USD, [SAMPLE_FILES.batchClean])
    const body = confirmation(detail)
    const app = body.sheets.find((s) => s.sheetId === sheetNamed(detail, 'APP').sheetId)
    if (!app) throw new Error('APP missing')
    app.columns = app.columns.filter((c) => c.sourceColumn !== 'Currency')

    const again = await service.confirmMapping(ANALYST, detail.importId, body)

    expect(again.status).toBe('mapped')
    expect(sheetNamed(again, 'APP').mapping?.columns.map((c) => c.sourceColumn)).toEqual(['ID', 'Amount'])
  })

  it('a body that does not fit the import is a MappingShapeError and changes nothing', async () => {
    const detail = await uploaded(A_USD, [SAMPLE_FILES.batchClean])
    const body = confirmation(detail)
    body.sheets.shift()

    await caught(service.confirmMapping(ANALYST, detail.importId, body), MappingShapeError)

    const after = await service.getImport(ANALYST, detail.importId)
    expect(after.status).toBe('uploaded')
    expect(after.files[0]?.sheets.some((s) => s.mappingConfirmed)).toBe(false)
  })

  it('an incomplete mapping is accepted and readiness names what is missing', async () => {
    const detail = await uploaded(A_USD, [SAMPLE_FILES.batchClean])
    const body = confirmation(detail)
    const app = body.sheets.find((s) => s.sheetId === sheetNamed(detail, 'APP').sheetId)
    if (!app) throw new Error('APP missing')
    app.columns = app.columns.filter((c) => c.targetField !== 'transactionId')

    const confirmed = await service.confirmMapping(ANALYST, detail.importId, body)

    expect(confirmed.status).toBe('mapped')
    expect(confirmed.readiness.canAnalyze).toBe(false)
    expect(confirmed.readiness.missing).toEqual([
      { sheetId: app.sheetId, sheetName: 'APP', field: 'transactionId', message: expect.any(String) },
    ])
  })

  it('is refused once the import is analyzed, and reads as not found outside the scope', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    const error = await caught(
      service.confirmMapping(ANALYST, detail.importId, confirmation(detail)),
      ImportNotEditableError,
    )
    expect(error.details).toEqual({ status: 'analyzed' })

    const legacy = await uploaded(C_ALT, [SAMPLE_FILES.legacy])
    await caught(service.confirmMapping(VIEWER, legacy.importId, confirmation(legacy)), NotFoundError)
  })
})

describe('analyze: state and preconditions', () => {
  it('refuses an import that is not mapped', async () => {
    const detail = await uploaded(A_USD, [SAMPLE_FILES.batchClean])

    const error = await caught(service.analyze(ANALYST, detail.importId), ImportNotMappedError)

    expect(error.details).toEqual({ status: 'uploaded' })
  })

  it('refuses a mapping without transactionId with 422 mapping_incomplete and writes no row', async () => {
    const detail = await uploaded(A_USD, [SAMPLE_FILES.batchClean])
    const body = confirmation(detail)
    const app = body.sheets.find((s) => s.sheetId === sheetNamed(detail, 'APP').sheetId)
    if (!app) throw new Error('APP missing')
    app.columns = app.columns.filter((c) => c.targetField !== 'transactionId')
    await service.confirmMapping(ANALYST, detail.importId, body)

    const error = await caught(service.analyze(ANALYST, detail.importId), MappingIncompleteError)

    expect(error.details).toEqual({
      missing: [{ sheetId: app.sheetId, sheetName: 'APP', field: 'transactionId', message: expect.any(String) }],
    })
    expect(rows.rowsOf(detail.importId)).toEqual([])
    expect((await service.getImport(ANALYST, detail.importId)).status).toBe('mapped')
  })

  it('names the sheets of a file added after the confirmation (field confirmation)', async () => {
    const detail = await mapped(A_USD, [SAMPLE_FILES.part1])
    const added = await service.addFiles(ANALYST, detail.importId, [await upload(SAMPLE_FILES.part2)])
    expect(added.status).toBe('mapped')
    expect(added.files[1]?.sheets.every((s) => !s.mappingConfirmed && s.mapping === null)).toBe(true)

    const error = await caught(service.analyze(ANALYST, detail.importId), MappingIncompleteError)

    const missing = error.details as { missing: { sheetName: string; field: string }[] }
    expect(missing.missing.map((m) => m.field)).toEqual(Array(10).fill('confirmation'))
    expect(missing.missing[0]?.sheetName).toBe('APP')
  })

  it('refuses an import over the per-import row cap before reading any row (design D1)', async () => {
    service = build({ maxRowsPerImport: 500 })
    const detail = await mapped(A_USD, [SAMPLE_FILES.batchClean])

    const error = await caught(service.analyze(ANALYST, detail.importId), ImportTooLargeError)

    expect(error.details).toEqual({ rows: 783, limit: 500 })
    expect(transactions.calls).toBe(0)
    expect(rows.rowsOf(detail.importId)).toEqual([])
    expect((await service.getImport(ANALYST, detail.importId)).status).toBe('mapped')
  })

  it('leaves the import mapped without rows when the write fails', async () => {
    const detail = await mapped(A_USD, [SAMPLE_FILES.batchClean])
    rows.failNextWrite()

    await expect(service.analyze(ANALYST, detail.importId)).rejects.toThrow('simulated database failure')

    expect(rows.rowsOf(detail.importId)).toEqual([])
    expect(await service.getImport(ANALYST, detail.importId)).toMatchObject({
      status: 'mapped',
      analyzedAt: null,
      analysis: null,
    })
  })

  it('refuses the claim when the mapping changed while the rows were being read', async () => {
    const detail = await mapped(A_USD, [SAMPLE_FILES.batchClean])
    const body = confirmation(detail)
    let hooked = false
    const original = reader.readRows.bind(reader)
    reader.readRows = (bytes, fileName, sheetName) => {
      if (!hooked) {
        hooked = true
        void imports.confirmMapping(detail.importId, imports.stored(detail.importId).updatedAt, body.sheets)
      }
      return original(bytes, fileName, sheetName)
    }

    const error = await caught(service.analyze(ANALYST, detail.importId), ImportNotMappedError)

    expect(error.details).toEqual({ status: 'mapped' })
    expect(error.message).toMatch(/changed/)
    expect(rows.rowsOf(detail.importId)).toEqual([])
  })
})

describe('analyze: the samples against expected.json', () => {
  it('batch-clean: 783 rows, 780 matched, 3 ignored, E 450 / I 10 / R 320, RAM-07 unassigned, two batch fees', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])

    expect(ImportDetailSchema.safeParse(detail).success).toBe(true)
    expect(detail).toMatchObject({ status: 'analyzed', rowsTotal: 783, rowsMatched: 780, rowsUnmatched: 0 })
    expect(detail.analyzedAt).not.toBeNull()
    expect(detail.analysis).toEqual({
      rows: { total: 783, matched: 780, unmatched: 0, ambiguous: 0, ignored: 3 },
      byCycle: { E: 450, I: 10, R: 320 },
      warnings: ZERO_WARNINGS,
    })
    expect(detail.channels?.map((c) => [c.name, c.assignment, c.otherAccount])).toEqual([
      ['RAM-01', 'assigned', null],
      ['RAM-02', 'assigned', null],
      ['RAM-07', 'unassigned', null],
    ])
    expect(detail.channels?.reduce((sum, c) => sum + c.rowCount, 0)).toBe(780)
    expect(detail.channels?.[2]?.note).toMatch(/associated to this account/)
    expect(detail.batchFees).toEqual([
      expect.objectContaining({ title: 'Wire Fee', amount: '25.0000', currency: 'USD', source: 'file' }),
      expect.objectContaining({ title: 'Settlement Fee', amount: '15.0000', currency: 'USD', source: 'file' }),
    ])
    expect(detail.batchFees?.every((f) => f.feeTypeId !== null && f.warning === undefined)).toBe(true)
    expect(detail.files[0]?.sheets.every((s) => s.mappingConfirmed)).toBe(true)

    const stored = rows.rowsOf(detail.importId)
    expect(stored).toHaveLength(783)
    const bySheet = (name: string) => stored.filter((r) => r.sheetName === name)
    expect(['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR'].map((n) => bySheet(n).length)).toEqual([340, 110, 3, 7, 3, 320])
    expect(stored.some((r) => r.sheetName === 'Other Fees' || r.sheetName === 'Settings')).toBe(false)
    const first = bySheet('APP')[0]
    expect(first).toMatchObject({
      rowNo: 2,
      transactionIdRaw: '252570479111759',
      gatewayId: 1,
      statusId: 2,
      statusRaw: null,
      cycle: 'E',
      amount: '16.2200',
      currency: 'USD',
      matchResult: 'matched',
      ignore: false,
      detailJson: null,
    })
    expect(first?.transactionId).not.toBeNull()
    expect(JSON.parse(first?.rawData ?? '{}')).toEqual({ ID: '252570479111759', Amount: '16.22', Currency: 'USD' })
    const rr = bySheet('RR')[0]
    expect(rr).toMatchObject({ cycle: 'R', statusRaw: null, statusId: rr?.transaction?.statusId })
    const leftover = bySheet('CHB').find((r) => r.rowNo === 4)
    expect(leftover).toMatchObject({ transactionIdRaw: '', matchResult: 'ignored', ignore: true, transactionId: null })
    expect(JSON.parse(leftover?.detailJson ?? '{}')).toEqual({ reason: 'empty_id' })
  })

  it('batch-split: part1 + part2 give the same counts as batch-clean', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.part1, SAMPLE_FILES.part2])

    expect(detail.analysis).toMatchObject({
      rows: { total: 783, matched: 780, unmatched: 0, ambiguous: 0, ignored: 3 },
      byCycle: { E: 450, I: 10, R: 320 },
    })
    expect(detail.channels?.map((c) => c.name)).toEqual(['RAM-01', 'RAM-02', 'RAM-07'])
    expect(rows.rowsOf(detail.importId).filter((r) => r.fileName.endsWith('part2.xlsx'))).toHaveLength(333)
  })

  it('batch-issues: one unmatched 16-digit id, one negative amount, RAM-13 unassigned, a fee type outside the catalog', async () => {
    const detail = await analyzed(B_MAIN, [SAMPLE_FILES.batchIssues])

    expect(detail.analysis).toEqual({
      rows: { total: 770, matched: 766, unmatched: 1, ambiguous: 0, ignored: 3 },
      byCycle: { E: 440, I: 10, R: 317 },
      warnings: { ...ZERO_WARNINGS, negative_amount: 1 },
    })
    expect(detail).toMatchObject({ rowsTotal: 770, rowsMatched: 766, rowsUnmatched: 1 })
    expect(detail.channels?.map((c) => [c.name, c.assignment])).toEqual([
      ['RAM-11', 'assigned'],
      ['RAM-12', 'assigned'],
      ['RAM-13', 'unassigned'],
    ])
    expect(detail.batchFees).toEqual([
      expect.objectContaining({ title: 'Wire Fee', amount: '25.0000' }),
      {
        feeTypeId: null,
        code: null,
        title: 'Fraud Monitoring Fee',
        amount: '99.0000',
        currency: 'USD',
        source: 'file',
        warning: expect.stringMatching(/catalog/),
      },
    ])
    const unmatched = rows.rowsOf(detail.importId).filter((r) => r.matchResult === 'unmatched')
    expect(unmatched).toHaveLength(1)
    expect(unmatched[0]).toMatchObject({ transactionIdRaw: '4260465812403708', transactionId: null, gatewayId: null })
    expect(JSON.parse(unmatched[0]?.detailJson ?? '{}')).toEqual({ reason: 'no_match' })
  })

  it('batch-blocked: the foreign channel row matches through the shared gateway; RAM-01 belongs to another account', async () => {
    const detail = await analyzed(B_MAIN, [SAMPLE_FILES.batchBlocked])

    expect(detail.analysis?.rows).toEqual({ total: 21, matched: 21, unmatched: 0, ambiguous: 0, ignored: 0 })
    expect(detail.channels?.find((c) => c.name === 'RAM-01')).toMatchObject({
      assignment: 'assigned_to_other_account',
      otherAccount: { accountId: A_USD, name: 'ProviderA-USD' },
      providerId: 101,
      rowCount: 1,
    })
  })

  it('legacy-provider: 81 matched on the UUID gateway, E 80 / I 1, CHB 2 excludes its amount, Failed is Declined', async () => {
    const detail = await analyzed(C_ALT, [SAMPLE_FILES.legacy])

    expect(detail.analysis).toEqual({
      rows: { total: 81, matched: 81, unmatched: 0, ambiguous: 0, ignored: 0 },
      byCycle: { E: 80, I: 1, R: 0 },
      warnings: ZERO_WARNINGS,
    })
    const stored = rows.rowsOf(detail.importId)
    expect(stored.every((r) => r.gatewayId === 2)).toBe(true)
    const cb = stored.find((r) => r.sheetName === 'CB')
    expect(cb).toMatchObject({
      statusRaw: 'CHB 2',
      statusId: 4,
      transactionIdRaw: 'df14616d-4b26-4ffb-9984-72717ebff6a6',
    })
    expect(JSON.parse(cb?.detailJson ?? '{}')).toEqual({ excludeAmount: true })
    const fail = stored.filter((r) => r.sheetName === 'Fail')
    expect(fail).toHaveLength(20)
    expect(fail.every((r) => r.statusId === 3 && r.statusRaw === 'Failed' && r.detailJson === null)).toBe(true)
    expect(detail.batchFees).toEqual([])
  })

  it('a numeric id cell that lost precision is never looked up: unmatched with reason lossy_numeric_id', async () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          rows: [
            ['ID', 'Amount', 'Currency'],
            [{ v: '12345678901234567' }, { v: '10' }, 'USD'],
            ['252570479111759', { v: '16.22' }, 'USD'],
          ],
        },
      ],
    })
    reader.registerReal(bytes)
    const staged = { fileName: 'lossy.xlsx', ...(await files.stageBytes(bytes)) }
    const detail = await service.createImport(ANALYST, ANALYST_ID, A_USD, [staged])
    const confirmed = await service.confirmMapping(ANALYST, detail.importId, confirmation(detail))

    const result = await service.analyze(ANALYST, confirmed.importId)

    expect(result.analysis).toMatchObject({
      rows: { total: 2, matched: 1, unmatched: 1, ambiguous: 0, ignored: 0 },
      warnings: { ...ZERO_WARNINGS, lossy_numeric_id: 1 },
    })
    const lossy = rows.rowsOf(detail.importId)[0]
    expect(lossy).toMatchObject({
      transactionIdRaw: '12345678901234567',
      matchResult: 'unmatched',
      transactionId: null,
    })
    expect(JSON.parse(lossy?.detailJson ?? '{}')).toEqual({
      reason: 'lossy_numeric_id',
      warnings: ['lossy_numeric_id'],
    })
  })

  it('an account without channels matches through the gateways of its provider; without those, nothing is looked up', async () => {
    const detail = await analyzed(NO_CHANNELS_ACCOUNT_ID, [SAMPLE_FILES.batchClean])
    expect(detail.analysis?.rows).toMatchObject({ matched: 780, unmatched: 0 })
    expect(detail.channels?.map((c) => [c.name, c.assignment, c.otherAccount?.name])).toEqual([
      ['RAM-01', 'assigned_to_other_account', 'ProviderA-USD'],
      ['RAM-02', 'assigned_to_other_account', 'ProviderA-USD'],
      ['RAM-07', 'unassigned', undefined],
    ])

    transactions.calls = 0
    const none = await analyzed(NO_PROVIDER_CHANNELS_ACCOUNT_ID, [SAMPLE_FILES.batchClean])
    expect(none.analysis?.rows).toMatchObject({ matched: 0, unmatched: 780, ignored: 3 })
    expect(transactions.calls).toBe(0)
    expect(JSON.parse(rows.rowsOf(none.importId)[0]?.detailJson ?? '{}')).toEqual({ reason: 'no_gateways' })
    expect(none.channels).toEqual([])
  })

  it('getImport after the analysis returns what analyze returned', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])

    expect(await service.getImport(ANALYST, detail.importId)).toEqual(detail)
  })
})

describe('ambiguous rows', () => {
  const GATEWAY_TEST = 9001

  beforeEach(() => {
    accounts.overrideGateways(A_USD, [
      { gatewayId: 1, idFormat: 'numeric' },
      { gatewayId: GATEWAY_TEST, idFormat: 'numeric' },
    ])
    transactions.add({
      transactionId: 999_999n,
      gatewayId: GATEWAY_TEST,
      gatewayName: 'Gateway Test',
      sourceTransactionId: '252570479111759',
      channelId: 9001,
      channelName: 'RAM-T1',
      providerId: 101,
      merchantId: 1,
      statusId: 2,
      statusName: 'Successful',
      amount: '16.2200',
      transactionDate: new Date('2026-10-01T00:00:00.000Z'),
    })
  })

  it('a second numeric gateway with the same id makes the row ambiguous, with both candidates', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])

    expect(detail.analysis?.rows).toEqual({ total: 783, matched: 779, unmatched: 0, ambiguous: 1, ignored: 3 })
    expect(detail).toMatchObject({ rowsMatched: 779, rowsUnmatched: 0 })
    const page = await service.listRows(ANALYST, detail.importId, { page: 1, pageSize: 50 })
    const row = page.items[0]
    expect(row).toMatchObject({
      matchResult: 'ambiguous',
      transactionId: null,
      gatewayId: null,
      rowNo: 2,
      sheetName: 'APP',
    })
    expect(row?.candidates.map((c) => [c.gatewayId, c.gatewayName, c.transactionId])).toEqual([
      [1, 'Gateway Numeric', expect.any(String)],
      [GATEWAY_TEST, 'Gateway Test', '999999'],
    ])
  })

  it('resolving an ambiguous R row takes the status of the chosen transaction, as the analysis does (review of the PR, L2)', async () => {
    const FIRST_RR_ID = '605317920155402'
    transactions.add({
      transactionId: 999_998n,
      gatewayId: GATEWAY_TEST,
      gatewayName: 'Gateway Test',
      sourceTransactionId: FIRST_RR_ID,
      channelId: 9001,
      channelName: 'RAM-T1',
      providerId: 101,
      merchantId: 1,
      statusId: 4,
      statusName: 'Chargeback',
      amount: '2.2700',
      transactionDate: new Date('2026-10-01T00:00:00.000Z'),
    })
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    const rr = sheetNamed(detail, 'RR')
    const before = (await service.listRows(ANALYST, detail.importId, { match: 'ambiguous', page: 1, pageSize: 50 }))
      .items
    expect(before.find((r) => r.sheetName === 'RR')).toMatchObject({ rowNo: 2, cycle: 'R', statusId: null })

    const resolved = await service.resolveRow(ANALYST, ANALYST_ID, detail.importId, rr.sheetId, 2, GATEWAY_TEST)

    expect(resolved).toMatchObject({ cycle: 'R', matchResult: 'matched', statusId: 4, statusName: 'Chargeback' })
    const app = sheetNamed(detail, 'APP')
    const e = await service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 2, GATEWAY_TEST)
    expect(e).toMatchObject({ cycle: 'E', statusId: 2 })
  })

  it('resolveRow picks the gateway, bumps rowsMatched and leaves an audit entry', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    const app = sheetNamed(detail, 'APP')

    const resolved = await service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 2, GATEWAY_TEST)

    expect(ImportRowItem.safeParse(resolved).success).toBe(true)
    expect(resolved).toMatchObject({
      matchResult: 'matched',
      gatewayId: GATEWAY_TEST,
      transactionId: '999999',
      transaction: { channelName: 'RAM-T1', statusName: 'Successful' },
    })
    expect(resolved.candidates).toHaveLength(2)
    const after = await service.getImport(ANALYST, detail.importId)
    expect(after).toMatchObject({ rowsMatched: 780 })
    expect(after.analysis?.rows).toMatchObject({ matched: 780, ambiguous: 0 })
    expect(audit.entries).toEqual([
      {
        userId: ANALYST_ID,
        action: 'import.row.resolve_gateway',
        entityType: 'ImportRow',
        entityId: `${app.sheetId}:2`,
        detail: expect.objectContaining({
          importId: detail.importId,
          gatewayId: GATEWAY_TEST,
          transactionId: '999999',
        }),
      },
    ])
  })

  it('resolving a row supersedes the current run without a replacement and audits supersededRunId (validation-runs P7)', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    imports.setCurrentRun(detail.importId, 41)
    const app = sheetNamed(detail, 'APP')

    await service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 2, GATEWAY_TEST)

    expect(audit.entries.at(-1)?.detail).toMatchObject({ supersededRunId: 41 })
    expect(await imports.currentRunId(detail.importId)).toBeNull()
  })

  it('resolving a row without a current run audits supersededRunId null', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    const app = sheetNamed(detail, 'APP')

    await service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 2, GATEWAY_TEST)

    expect(audit.entries.at(-1)?.detail).toMatchObject({ supersededRunId: null })
  })

  it('a gateway that is not a candidate, a row that is not ambiguous, a wrong state and an unknown row', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    const app = sheetNamed(detail, 'APP')

    const notCandidate = await caught(
      service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 2, 2),
      CandidateNotFoundError,
    )
    expect(notCandidate.details).toMatchObject({ gatewayId: 2 })
    const notAmbiguous = await caught(
      service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 3, 1),
      RowNotAmbiguousError,
    )
    expect(notAmbiguous.details).toEqual({ matchResult: 'matched' })
    await caught(service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 9999, 1), NotFoundError)
    await caught(service.resolveRow(ANALYST, ANALYST_ID, UNKNOWN_UUID, app.sheetId, 2, GATEWAY_TEST), NotFoundError)

    await imports.setStatus(detail.importId, 'validated')
    const state = await caught(
      service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 2, GATEWAY_TEST),
      ImportNotEditableError,
    )
    expect(state.details).toEqual({ status: 'validated' })
  })

  it('a failing audit write does not undo the resolution', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    const app = sheetNamed(detail, 'APP')
    audit.failWith = new Error('audit down')

    const resolved = await service.resolveRow(ANALYST, ANALYST_ID, detail.importId, app.sheetId, 2, GATEWAY_TEST)

    expect(resolved.matchResult).toBe('matched')
    expect(log.error).toHaveBeenCalled()
  })
})

describe('listRows', () => {
  it('orders unmatched, ambiguous, matched and ignored, then by file, sheet and row', async () => {
    const detail = await analyzed(B_MAIN, [SAMPLE_FILES.batchIssues])

    const page = await service.listRows(ANALYST, detail.importId, { page: 1, pageSize: 5 })

    expect(page.total).toBe(770)
    expect(page.items.map((r) => [r.matchResult, r.sheetName, r.rowNo])).toEqual([
      ['unmatched', 'APP', 340],
      ['matched', 'APP', 2],
      ['matched', 'APP', 3],
      ['matched', 'APP', 4],
      ['matched', 'APP', 5],
    ])
    expect(ImportRowItem.safeParse(page.items[0]).success).toBe(true)
    expect(page.items[0]).toMatchObject({
      fileName: SAMPLE_FILES.batchIssues.fileName,
      cycle: 'E',
      reason: 'no_match',
      transactionIdRaw: '4260465812403708',
      transactionId: null,
      statusId: 2,
      statusName: 'Successful',
      amount: '120.0000',
      currency: 'USD',
      excludeAmount: false,
      warnings: [],
      candidates: [],
      transaction: null,
      rawData: { ID: '4260465812403708', Amount: '120', Currency: 'USD' },
    })
    expect(page.items[1]?.transaction).toMatchObject({
      channelName: expect.stringMatching(/^RAM-1/),
      statusName: expect.any(String),
    })

    const last = await service.listRows(ANALYST, detail.importId, { page: 154, pageSize: 5 })
    expect(last.items.map((r) => r.matchResult)).toEqual(['matched', 'matched', 'ignored', 'ignored', 'ignored'])
    expect(last.items.slice(2).map((r) => [r.sheetName, r.rowNo])).toEqual([
      ['CHB', 9],
      ['RDR', 2],
      ['REF', 5],
    ])
  })

  it('filters by match and by sheet, paginates, and is empty before the analysis', async () => {
    const before = await mapped(A_USD, [SAMPLE_FILES.batchClean])
    expect(await service.listRows(ANALYST, before.importId, { page: 1, pageSize: 50 })).toEqual({
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
    })

    const detail = await service.analyze(ANALYST, before.importId)
    const ignored = await service.listRows(ANALYST, detail.importId, { match: 'ignored', page: 1, pageSize: 50 })
    expect(ignored.total).toBe(3)
    expect(ignored.items.map((r) => [r.sheetName, r.rowNo, r.reason])).toEqual([
      ['CHB', 4, 'empty_id'],
      ['RDR', 4, 'empty_id'],
      ['REF', 8, 'empty_id'],
    ])
    const matched = await service.listRows(ANALYST, detail.importId, { match: 'matched', page: 16, pageSize: 50 })
    expect(matched).toMatchObject({ page: 16, pageSize: 50, total: 780 })
    expect(matched.items).toHaveLength(30)
    const rr = await service.listRows(ANALYST, detail.importId, {
      sheetId: sheetNamed(detail, 'RR').sheetId,
      page: 1,
      pageSize: 10,
    })
    expect(rr.total).toBe(320)
    expect(rr.items.every((r) => r.cycle === 'R' && r.statusId !== null && r.transaction !== null)).toBe(true)

    await caught(
      service.listRows(VIEWER, (await uploaded(C_ALT, [SAMPLE_FILES.legacy])).importId, { page: 1, pageSize: 50 }),
      NotFoundError,
    )
  })
})

describe('cancel', () => {
  it('cancels an analyzed import keeping files, rows and the analysis, and records it', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])

    const cancelled = await service.cancel(ANALYST, ANALYST_ID, detail.importId)

    expect(cancelled).toMatchObject({
      status: 'cancelled',
      analysis: detail.analysis,
      channels: detail.channels,
      batchFees: detail.batchFees,
    })
    expect(cancelled.files).toEqual(detail.files)
    expect(files.paths()).toContain(`imports/${detail.importId}/${detail.files[0]?.fileId}.xlsx`)
    expect(rows.rowsOf(detail.importId)).toHaveLength(783)
    expect((await service.listRows(ANALYST, detail.importId, { page: 1, pageSize: 1 })).total).toBe(783)
    expect(audit.entries).toEqual([
      {
        userId: ANALYST_ID,
        action: 'import.cancel',
        entityType: 'Import',
        entityId: detail.importId,
        detail: { previousStatus: 'analyzed', runId: null },
      },
    ])
  })

  it('records the current run in the audit and keeps it current: the run is the evidence (validation-runs D12)', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    imports.setCurrentRun(detail.importId, 7)

    await service.cancel(ANALYST, ANALYST_ID, detail.importId)

    expect(audit.entries.at(-1)).toMatchObject({
      action: 'import.cancel',
      detail: { previousStatus: 'analyzed', runId: 7 },
    })
    expect(await imports.currentRunId(detail.importId)).toBe(7)
  })

  it('cancels from uploaded and from mapped too; then the files cannot be touched', async () => {
    const uploadedOne = await uploaded(A_USD, [SAMPLE_FILES.batchClean])
    expect(await service.cancel(ANALYST, ANALYST_ID, uploadedOne.importId)).toMatchObject({
      status: 'cancelled',
      analysis: null,
    })
    await caught(
      service.addFiles(ANALYST, uploadedOne.importId, [await upload(SAMPLE_FILES.part1)]),
      ImportNotEditableError,
    )

    const mappedOne = await mapped(C_ALT, [SAMPLE_FILES.legacy])
    expect((await service.cancel(ANALYST, ANALYST_ID, mappedOne.importId)).status).toBe('cancelled')
  })

  it('refuses a processed or an already cancelled import, and reads as not found outside the scope', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    await service.cancel(ANALYST, ANALYST_ID, detail.importId)
    const twice = await caught(service.cancel(ANALYST, ANALYST_ID, detail.importId), ImportNotCancellableError)
    expect(twice.details).toEqual({ status: 'cancelled' })

    const processed = await analyzed(A_USD, [SAMPLE_FILES.part1])
    await imports.setStatus(processed.importId, 'processed')
    await caught(service.cancel(ANALYST, ANALYST_ID, processed.importId), ImportNotCancellableError)

    const legacy = await uploaded(C_ALT, [SAMPLE_FILES.legacy])
    await caught(service.cancel(VIEWER, ANALYST_ID, legacy.importId), NotFoundError)
  })
})

// ───────────────────────── verify follow-ups (W1, W4, W5) ─────────────────────────

describe('confirmMapping: a sheet without proposal (spec: import, D6)', () => {
  it('confirms Bonus as transactions/I/Refund: readiness stops missing it, the proposal still reads source none, and it analyzes', async () => {
    const detail = await uploaded(A_USD, [SAMPLE_FILES.unruled])
    const bonus = sheetNamed(detail, 'Bonus')
    const app = sheetNamed(detail, 'APP')
    expect(bonus.proposed).toMatchObject({ kind: null, source: 'none' })
    expect(detail.readiness.missing.map((m) => [m.sheetName, m.field])).toEqual([['Bonus', 'kind']])

    const body: MappingConfirmation = {
      sheets: [
        {
          sheetId: app.sheetId,
          kind: 'transactions',
          cycle: 'E',
          statusId: 2,
          columns: [
            { sourceColumn: 'ID', targetField: 'transactionId' },
            { sourceColumn: 'Amount', targetField: 'amount' },
            { sourceColumn: 'Currency', targetField: 'currency' },
          ],
        },
        {
          sheetId: bonus.sheetId,
          kind: 'transactions',
          cycle: 'I',
          statusId: 5,
          columns: [{ sourceColumn: 'Reference', targetField: 'transactionId' }],
        },
      ],
    }
    const confirmed = await service.confirmMapping(ANALYST, detail.importId, body)

    expect(confirmed.status).toBe('mapped')
    expect(confirmed.readiness).toMatchObject({ canAnalyze: true, missing: [] })
    expect(sheetNamed(confirmed, 'Bonus')).toMatchObject({
      mappingConfirmed: true,
      mapping: {
        kind: 'transactions',
        cycle: 'I',
        statusId: 5,
        statusName: 'Refund',
        columns: [{ sourceColumn: 'Reference', targetField: 'transactionId' }],
      },
      proposed: { kind: null, source: 'none' },
    })

    const analyzed = await service.analyze(ANALYST, detail.importId)
    expect(analyzed.analysis?.rows).toEqual({ total: 4, matched: 2, unmatched: 2, ambiguous: 0, ignored: 0 })
    const bonusRows = rows.rowsOf(detail.importId).filter((r) => r.sheetName === 'Bonus')
    expect(bonusRows.map((r) => [r.rowNo, r.cycle, r.statusId, r.transactionIdRaw])).toEqual([
      [2, 'I', 5, 'x'],
      [3, 'I', 5, 'y'],
    ])
    expect(bonusRows.every((r) => JSON.parse(r.detailJson ?? '{}').reason === 'id_format')).toBe(true)
  })
})

/** A rules repository the test can switch at will: the rules in force at the next call. */
class MutableRulesRepository implements MatchingRulesRepository {
  current: MatchingRules = RULES_FOR_PROVIDER_A

  async rulesFor(): Promise<MatchingRules> {
    return structuredClone(this.current)
  }
}

/** The global rules of the template with APP proposed as Declined and, optionally, Other Fees proposed as ignore. */
function rulesChanged(options: { otherFeesIgnored: boolean }): MatchingRules {
  const changed = structuredClone(RULES_FOR_PROVIDER_A)
  for (const rule of changed.global.sheetRules) {
    if (rule.sheetPattern === 'APP') rule.statusId = 3
    if (options.otherFeesIgnored && rule.sheetPattern === 'Other Fees') {
      rule.kind = 'ignore'
      rule.cycle = null
      rule.statusId = null
    }
  }
  return changed
}

describe('the confirmed mapping governs once rules change (spec: matching, D6)', () => {
  let mutableRules: MutableRulesRepository

  beforeEach(() => {
    mutableRules = new MutableRulesRepository()
    service = build(undefined, mutableRules)
  })

  it('a rule that changes after the confirmation does not touch the analysis: rows keep the confirmed status', async () => {
    const detail = await mapped(A_USD, [SAMPLE_FILES.batchClean])
    expect(sheetNamed(detail, 'APP')).toMatchObject({ mapping: { statusId: 2 }, proposed: { statusId: 2 } })
    // The rule changes between the confirmation and the analysis (createImport already calls the repository twice).
    mutableRules.current = rulesChanged({ otherFeesIgnored: false })

    const analyzed = await service.analyze(ANALYST, detail.importId)

    const app = sheetNamed(analyzed, 'APP')
    expect(app.proposed).toMatchObject({ statusId: 3, statusName: 'Declined', source: 'global' })
    expect(app.mapping).toMatchObject({ statusId: 2, statusName: 'Successful' })
    const appRows = rows.rowsOf(detail.importId).filter((r) => r.sheetName === 'APP')
    expect(appRows).toHaveLength(340)
    expect(appRows.every((r) => r.statusId === 2 && r.statusRaw === null)).toBe(true)
    expect(analyzed.analysis?.rows).toMatchObject({ matched: 780 })
  })

  it('a rule set that changes after the analysis leaves rows, mapping, analysis, channels and batch fees untouched', async () => {
    const detail = await analyzed(A_USD, [SAMPLE_FILES.batchClean])
    const before = await service.listRows(ANALYST, detail.importId, { page: 1, pageSize: 50 })
    // Simulates the account moving to another rule set (there is no API for it in the MVP): APP → Declined, Other Fees → ignore.
    mutableRules.current = rulesChanged({ otherFeesIgnored: true })

    const after = await service.getImport(ANALYST, detail.importId)

    expect(sheetNamed(after, 'APP').proposed).toMatchObject({ statusId: 3 })
    expect(sheetNamed(after, 'Other Fees').proposed).toMatchObject({ kind: 'ignore' })
    expect(after.analysis).toEqual(detail.analysis)
    expect(after.channels).toEqual(detail.channels)
    expect(after.batchFees).toEqual(detail.batchFees)
    expect(after.batchFees).toHaveLength(2)
    expect(after.files.flatMap((f) => f.sheets).map((s) => s.mapping)).toEqual(
      detail.files.flatMap((f) => f.sheets).map((s) => s.mapping),
    )
    expect(await service.listRows(ANALYST, detail.importId, { page: 1, pageSize: 50 })).toEqual(before)
  })
})
