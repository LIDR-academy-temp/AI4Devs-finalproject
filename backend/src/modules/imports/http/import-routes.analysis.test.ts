import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ImportDetail, ImportRowItem, ImportRowsPage, type MappingConfirmation } from '@recon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { InMemoryAuditLogger } from '../../../test-support/in-memory-audit-logger.js'
import {
  ACCOUNT_IDS,
  FakeWorkbookReader,
  InMemoryFileStore,
  InMemoryImportRepository,
  InMemoryMatchingRulesRepository,
  SAMPLE_FILES,
  sequentialIds,
} from '../application/__fakes__/in-memory.js'
import {
  InMemoryAccountContext,
  InMemoryFeeTypeCatalog,
  InMemoryImportRowRepository,
  InMemoryTransactionLookup,
} from '../application/__fakes__/in-memory-analysis.js'
import { ImportService } from '../application/import-service.js'

// The five routes of import-analyze over the service on doubles (design D14): status codes, error codes and the
// shape of every body, with the real batch-clean file and two transactions that make its first row ambiguous.
const SAMPLES = path.resolve(import.meta.dirname, '../../../../../data/samples')
const REAL_BATCH_CLEAN = readFileSync(path.join(SAMPLES, 'batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx'))
const A_USD = ACCOUNT_IDS['ProviderA-USD']
const C_USD = ACCOUNT_IDS['ProviderC-USD']
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
const GATEWAY_TEST = 9001
const FIRST_APP_ID = '252570479111759'

let ctx: Awaited<ReturnType<typeof buildTestApp>>
let imports: InMemoryImportRepository
let audit: InMemoryAuditLogger

beforeEach(async () => {
  const files = new InMemoryFileStore()
  imports = new InMemoryImportRepository()
  const reader = new FakeWorkbookReader()
  reader.registerReal(REAL_BATCH_CLEAN)
  const transactions = new InMemoryTransactionLookup([])
  const accounts = new InMemoryAccountContext()
  audit = new InMemoryAuditLogger()
  // Two numeric gateways holding the id of the first APP row: that row is ambiguous, the rest unmatched.
  accounts.overrideGateways(A_USD, [
    { gatewayId: 1, idFormat: 'numeric' },
    { gatewayId: GATEWAY_TEST, idFormat: 'numeric' },
  ])
  const base = {
    sourceTransactionId: FIRST_APP_ID,
    providerId: 101,
    statusId: 2,
    statusName: 'Successful',
    amount: '16.2200',
    transactionDate: new Date('2026-10-01T00:00:00.000Z'),
  }
  transactions.add({
    ...base,
    transactionId: 1n,
    gatewayId: 1,
    gatewayName: 'Gateway Numeric',
    channelId: 1001,
    channelName: 'RAM-01',
  })
  transactions.add({
    ...base,
    transactionId: 999_999n,
    gatewayId: GATEWAY_TEST,
    gatewayName: 'Gateway Test',
    channelId: 9001,
    channelName: 'RAM-T1',
  })
  const service = new ImportService({
    imports,
    files,
    reader,
    rules: new InMemoryMatchingRulesRepository(),
    ids: sequentialIds(),
    log: { error: vi.fn(), warn: vi.fn() },
    rows: new InMemoryImportRowRepository(imports, transactions),
    transactions,
    accounts,
    feeTypes: new InMemoryFeeTypeCatalog(),
    audit,
    limits: { maxRowsPerImport: 100_000 },
  })
  ctx = await buildTestApp({ imports: { service, files } })
  await ctx.app.ready()
})

afterEach(async () => {
  await ctx.app.close()
})

async function tokenOf(userName: string): Promise<string> {
  const { accessToken } = await ctx.authService.login({ userName, password: PASSWORD })
  return accessToken
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH'

async function request(method: Method, url: string, options: { body?: unknown; user?: string | null } = {}) {
  const user = options.user === undefined ? 'analyst' : options.user
  const headers: Record<string, string> = {}
  if (user) headers.authorization = `Bearer ${await tokenOf(user)}`
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers,
    ...(options.body === undefined ? {} : { payload: options.body }),
  })
}

async function uploadBatchClean(accountId = A_USD): Promise<ImportDetail> {
  const form = new FormData()
  form.append('files', new Blob([new Uint8Array(REAL_BATCH_CLEAN)]), SAMPLE_FILES.batchClean.fileName)
  const response = new Response(form)
  const res = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/accounts/${accountId}/imports`,
    headers: {
      authorization: `Bearer ${await tokenOf('analyst')}`,
      'content-type': response.headers.get('content-type') as string,
    },
    payload: Buffer.from(await response.arrayBuffer()),
  })
  expect(res.statusCode).toBe(201)
  return ImportDetail.parse(res.json())
}

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

async function mappedImport(): Promise<ImportDetail> {
  const detail = await uploadBatchClean()
  const res = await request('PUT', `/imports/${detail.importId}/mapping`, { body: confirmation(detail) })
  expect(res.statusCode).toBe(200)
  return ImportDetail.parse(res.json())
}

async function analyzedImport(): Promise<ImportDetail> {
  const detail = await mappedImport()
  const res = await request('POST', `/imports/${detail.importId}/analyze`)
  expect(res.statusCode).toBe(200)
  return ImportDetail.parse(res.json())
}

const appSheet = (detail: ImportDetail) => {
  const sheet = detail.files[0]?.sheets.find((s) => s.sheetName === 'APP')
  if (!sheet) throw new Error('APP missing')
  return sheet
}

describe('PUT /api/v1/imports/{importId}/mapping', () => {
  it('answers 401 without a token and 403 forbidden for viewer', async () => {
    const detail = await uploadBatchClean()
    const body = confirmation(detail)

    expect((await request('PUT', `/imports/${detail.importId}/mapping`, { body, user: null })).statusCode).toBe(401)
    const forbidden = await request('PUT', `/imports/${detail.importId}/mapping`, { body, user: 'viewer' })
    expect(forbidden.statusCode).toBe(403)
    expect(forbidden.json().code).toBe('forbidden')
  })

  it('answers 400 validation_error for a body outside the schema and for a sheet left out', async () => {
    const detail = await uploadBatchClean()
    const body = confirmation(detail)

    const bad = await request('PUT', `/imports/${detail.importId}/mapping`, {
      body: { sheets: [{ ...body.sheets[0], kind: 'x' }] },
    })
    expect(bad.statusCode).toBe(400)
    expect(bad.json().code).toBe('validation_error')

    const omitted = await request('PUT', `/imports/${detail.importId}/mapping`, {
      body: { sheets: body.sheets.slice(1) },
    })
    expect(omitted.statusCode).toBe(400)
    expect(omitted.json()).toMatchObject({ code: 'validation_error', details: { sheetId: body.sheets[0]?.sheetId } })
  })

  it('answers 404 not_found outside the scope, identical to an unknown import', async () => {
    const detail = await uploadBatchClean(C_USD)
    const body = confirmation(detail)

    const outside = await request('PUT', `/imports/${detail.importId}/mapping`, { body, user: 'viewer' })
    const unknown = await request('PUT', `/imports/${UNKNOWN_UUID}/mapping`, { body, user: 'viewer' })

    expect(outside.statusCode).toBe(404)
    expect(outside.body).toBe(unknown.body)
  })

  it('answers 200 with the import in mapped, and 409 import_not_editable once analyzed', async () => {
    const detail = await uploadBatchClean()

    const res = await request('PUT', `/imports/${detail.importId}/mapping`, { body: confirmation(detail) })

    expect(res.statusCode).toBe(200)
    const mapped = ImportDetail.parse(res.json())
    expect(mapped.status).toBe('mapped')
    expect(appSheet(mapped)).toMatchObject({
      mappingConfirmed: true,
      mapping: { kind: 'transactions', cycle: 'E', statusId: 2 },
    })

    await request('POST', `/imports/${detail.importId}/analyze`)
    const again = await request('PUT', `/imports/${detail.importId}/mapping`, { body: confirmation(detail) })
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ code: 'import_not_editable', details: { status: 'analyzed' } })
  })
})

describe('POST /api/v1/imports/{importId}/analyze', () => {
  it('answers 401, 403 for viewer and 409 import_not_mapped before the confirmation', async () => {
    const detail = await uploadBatchClean()

    expect((await request('POST', `/imports/${detail.importId}/analyze`, { user: null })).statusCode).toBe(401)
    expect((await request('POST', `/imports/${detail.importId}/analyze`, { user: 'viewer' })).statusCode).toBe(403)
    const notMapped = await request('POST', `/imports/${detail.importId}/analyze`)
    expect(notMapped.statusCode).toBe(409)
    expect(notMapped.json()).toMatchObject({ code: 'import_not_mapped', details: { status: 'uploaded' } })
  })

  it('answers 422 mapping_incomplete naming the sheet and the field', async () => {
    const detail = await uploadBatchClean()
    const body = confirmation(detail)
    const app = body.sheets.find((s) => s.sheetId === appSheet(detail).sheetId)
    if (!app) throw new Error('APP missing')
    app.columns = app.columns.filter((c) => c.targetField !== 'transactionId')
    expect((await request('PUT', `/imports/${detail.importId}/mapping`, { body })).statusCode).toBe(200)

    const res = await request('POST', `/imports/${detail.importId}/analyze`)

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({
      code: 'mapping_incomplete',
      details: { missing: [{ sheetId: app.sheetId, sheetName: 'APP', field: 'transactionId' }] },
    })
  })

  it('answers 200 with the analysis, the channels and the batch fees', async () => {
    const detail = await mappedImport()

    const res = await request('POST', `/imports/${detail.importId}/analyze`)

    expect(res.statusCode).toBe(200)
    const analyzed = ImportDetail.parse(res.json())
    expect(analyzed.status).toBe('analyzed')
    expect(analyzed.analysis?.rows).toEqual({ total: 783, matched: 0, unmatched: 779, ambiguous: 1, ignored: 3 })
    expect(analyzed.channels).toEqual([])
    expect(analyzed.batchFees).toHaveLength(2)
    expect((await request('GET', `/imports/${detail.importId}`)).json()).toEqual(res.json())
  })
})

describe('GET /api/v1/imports/{importId}/rows', () => {
  it('answers 401 without a token and 400 validation_error for a query outside the schema', async () => {
    const detail = await analyzedImport()

    expect((await request('GET', `/imports/${detail.importId}/rows`, { user: null })).statusCode).toBe(401)
    for (const query of ['page=0', 'pageSize=0', 'pageSize=501', 'match=weird', 'sheetId=abc']) {
      const res = await request('GET', `/imports/${detail.importId}/rows?${query}`)
      expect(res.statusCode, query).toBe(400)
      expect(res.json().code, query).toBe('validation_error')
    }
  })

  it('answers 404 not_found outside the scope, identical to an unknown import', async () => {
    const detail = await uploadBatchClean(C_USD)

    const outside = await request('GET', `/imports/${detail.importId}/rows`, { user: 'viewer' })
    const unknown = await request('GET', `/imports/${UNKNOWN_UUID}/rows`, { user: 'viewer' })

    expect(outside.statusCode).toBe(404)
    expect(outside.body).toBe(unknown.body)
  })

  it('answers 200 with a page: unmatched first, then the ambiguous row with its candidates; empty before the analysis', async () => {
    const uploaded = await uploadBatchClean()
    const before = await request('GET', `/imports/${uploaded.importId}/rows`, { user: 'viewer' })
    expect(before.statusCode).toBe(200)
    expect(before.json()).toEqual({ items: [], page: 1, pageSize: 50, total: 0 })

    const detail = await analyzedImport()
    const res = await request('GET', `/imports/${detail.importId}/rows?page=1&pageSize=3`, { user: 'viewer' })

    expect(res.statusCode).toBe(200)
    const page = ImportRowsPage.parse(res.json())
    expect(page).toMatchObject({ page: 1, pageSize: 3, total: 783 })
    expect(page.items.map((r) => [r.matchResult, r.rowNo])).toEqual([
      ['unmatched', 3],
      ['unmatched', 4],
      ['unmatched', 5],
    ])
    expect(page.items[0]).toMatchObject({ transactionId: null, reason: 'no_match', sheetName: 'APP' })

    const ambiguous = ImportRowsPage.parse(
      (await request('GET', `/imports/${detail.importId}/rows?match=ambiguous`)).json(),
    )
    expect(ambiguous.total).toBe(1)
    expect(ambiguous.items[0]).toMatchObject({ rowNo: 2, transactionIdRaw: FIRST_APP_ID })
    expect(ambiguous.items[0]?.candidates.map((c) => c.gatewayId)).toEqual([1, GATEWAY_TEST])
  })
})

describe('PATCH /api/v1/imports/{importId}/rows/{sheetId}/{rowNo}', () => {
  it('answers 401, 403 for viewer and 400 for a rowNo that is not a positive integer', async () => {
    const detail = await analyzedImport()
    const url = `/imports/${detail.importId}/rows/${appSheet(detail).sheetId}/2`

    expect((await request('PATCH', url, { body: { gatewayId: GATEWAY_TEST }, user: null })).statusCode).toBe(401)
    expect((await request('PATCH', url, { body: { gatewayId: GATEWAY_TEST }, user: 'viewer' })).statusCode).toBe(403)
    const bad = await request('PATCH', `/imports/${detail.importId}/rows/${appSheet(detail).sheetId}/abc`, {
      body: { gatewayId: GATEWAY_TEST },
    })
    expect(bad.statusCode).toBe(400)
    expect((await request('PATCH', url, { body: { gatewayId: 0 } })).statusCode).toBe(400)
  })

  it('answers 409 import_not_editable before the analysis and 404 for an unknown row', async () => {
    const uploaded = await uploadBatchClean()
    const early = await request('PATCH', `/imports/${uploaded.importId}/rows/${appSheet(uploaded).sheetId}/2`, {
      body: { gatewayId: GATEWAY_TEST },
    })
    expect(early.statusCode).toBe(409)
    expect(early.json()).toMatchObject({ code: 'import_not_editable', details: { status: 'uploaded' } })

    const detail = await analyzedImport()
    const unknown = await request('PATCH', `/imports/${detail.importId}/rows/${appSheet(detail).sheetId}/9999`, {
      body: { gatewayId: GATEWAY_TEST },
    })
    expect(unknown.statusCode).toBe(404)
    expect(unknown.json().code).toBe('not_found')
  })

  it('answers 400 with the candidates for a gateway that is not one, 200 with the row when it is, then 409 row_not_ambiguous', async () => {
    const detail = await analyzedImport()
    const url = `/imports/${detail.importId}/rows/${appSheet(detail).sheetId}/2`

    const notCandidate = await request('PATCH', url, { body: { gatewayId: 2 } })
    expect(notCandidate.statusCode).toBe(400)
    expect(notCandidate.json()).toMatchObject({ code: 'validation_error', details: { gatewayId: 2 } })
    expect(notCandidate.json().details.candidates).toHaveLength(2)

    const resolved = await request('PATCH', url, { body: { gatewayId: GATEWAY_TEST } })
    expect(resolved.statusCode).toBe(200)
    const row = ImportRowItem.parse(resolved.json())
    expect(row).toMatchObject({ matchResult: 'matched', gatewayId: GATEWAY_TEST, transactionId: '999999' })
    expect(audit.entries.map((e) => e.action)).toEqual(['import.row.resolve_gateway'])

    const again = await request('PATCH', url, { body: { gatewayId: GATEWAY_TEST } })
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ code: 'row_not_ambiguous', details: { matchResult: 'matched' } })
  })
})

describe('POST /api/v1/imports/{importId}/cancel', () => {
  it('answers 401, 403 for viewer and 404 outside the scope', async () => {
    const detail = await uploadBatchClean(C_USD)

    expect((await request('POST', `/imports/${detail.importId}/cancel`, { user: null })).statusCode).toBe(401)
    const outside = await request('POST', `/imports/${detail.importId}/cancel`, { user: 'viewer' })
    expect(outside.statusCode).toBe(404)
    expect(outside.body).toBe((await request('POST', `/imports/${UNKNOWN_UUID}/cancel`, { user: 'viewer' })).body)
    const own = await uploadBatchClean()
    expect((await request('POST', `/imports/${own.importId}/cancel`, { user: 'viewer' })).statusCode).toBe(403)
  })

  it('answers 200 with the import cancelled, then 409 import_not_cancellable', async () => {
    const detail = await analyzedImport()

    const res = await request('POST', `/imports/${detail.importId}/cancel`)

    expect(res.statusCode).toBe(200)
    const cancelled = ImportDetail.parse(res.json())
    expect(cancelled).toMatchObject({ status: 'cancelled', analysis: detail.analysis })
    expect(audit.entries.map((e) => e.action)).toEqual(['import.cancel'])

    const again = await request('POST', `/imports/${detail.importId}/cancel`)
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ code: 'import_not_cancellable', details: { status: 'cancelled' } })
  })
})
