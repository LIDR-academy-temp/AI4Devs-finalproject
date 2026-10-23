import {
  AccountSettlementsPage,
  ImportSettlements,
  ROLES,
  SettlementTransactionsPage,
  SettlementView,
} from '@recon/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { InMemoryAuditLogger } from '../../../test-support/in-memory-audit-logger.js'
import {
  InMemoryPrefilledBatchFees,
  InMemorySettlementReader,
  InMemorySettlementRepository,
  InMemorySettlementSource,
} from '../application/__fakes__/in-memory.js'
import {
  BATCH_HEADER,
  InMemorySettlementQueries,
  RecordingSettlementReader,
  storedMovement,
} from '../application/__fakes__/in-memory-reads.js'
import { SettlementReadService } from '../application/settlement-read-service.js'
import { SettlementService } from '../application/settlement-service.js'
import { EXAMPLE_BATCH_ID, exampleView } from '../test-support/example-view.js'
import { exportRow } from '../test-support/export-rows.js'
import { settlementSampleInput } from '../test-support/sample-input.js'

// README §4.4 (summary-exports "Contrato para #13"): the four read routes against the shared schemas, the permission of
// the export before the scope, the identical 404, errors in JSON (also on the export) and the headers of the download.
const input = await settlementSampleInput('batch-clean')
const UNKNOWN = '00000000-0000-4000-8000-00000000ffff'
const OTHER_BATCH = '9d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e'
const IMPORT_ID = '7b0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c44'
/** A user of merchant 1 with every viewer permission but reports.view (no seeded role lacks it: design insumo 3). */
const NO_REPORTS = 'no_reports'
const ACCOUNT_ID = BATCH_HEADER.accountId
const OTHER_ACCOUNT = 'c0000000-0000-4000-8000-000000000003'
let ctx: Awaited<ReturnType<typeof buildTestApp>> | undefined
let audit: InMemoryAuditLogger
let lastQueries: InMemorySettlementQueries

function accountAttempt(batchNo: number) {
  return {
    batchId: `00000000-0000-4000-8000-${String(batchNo).padStart(12, '0')}`,
    importId: IMPORT_ID,
    batchNo,
    attemptNo: 1,
    status: 'paid' as const,
    settledStatus: 'settled' as const,
    settlementDate: '2026-10-24',
    processedAt: '2026-10-22T15:40:03.120Z',
    approvedBy: { userId: 2, userName: 'analyst' },
    amountPayable: '33771.3600',
    channels: 'RAM-01,RAM-02',
  }
}

afterEach(async () => {
  await ctx?.app.close()
  ctx = undefined
})

async function app() {
  audit = new InMemoryAuditLogger()
  const queries = new InMemorySettlementQueries({
    headers: [BATCH_HEADER, { ...BATCH_HEADER, batchId: OTHER_BATCH, status: 'paid' }],
    movements: [storedMovement()],
    exportRows: [exportRow('911545593909470', 'E', 'Successful'), exportRow('911545512345678', 'R', 'Successful')],
    attempts: [{ importId: IMPORT_ID, currentBatchId: null, items: [] }],
    accountSettlements: new Map([
      [ACCOUNT_ID, [accountAttempt(122), accountAttempt(121)]],
      [OTHER_ACCOUNT, [accountAttempt(7)]],
    ]),
    merchantOf: new Map([
      [OTHER_BATCH, 2],
      [OTHER_ACCOUNT, 2],
    ]),
  })
  lastQueries = queries
  const reads = new SettlementReadService({
    queries,
    reader: new RecordingSettlementReader(new Map([[EXAMPLE_BATCH_ID, exampleView()]])),
    audit,
  })
  const service = new SettlementService({
    source: new InMemorySettlementSource(input),
    prefilled: new InMemoryPrefilledBatchFees(input.prefilledFeeTypeIds),
    repository: new InMemorySettlementRepository(),
    reader: new InMemorySettlementReader(),
  })
  ctx = await buildTestApp({ settlement: { service, reads } })
  const viewer = ctx.users.users.find((u) => u.userName === 'viewer')!
  ctx.users.users.push({
    ...structuredClone(viewer),
    userId: 90,
    userName: NO_REPORTS,
    email: 'no_reports@recon.local',
    permissions: [...ROLES.find((r) => r.name === 'viewer')!.permissions].filter((p) => p !== 'reports.view'),
  })
  await ctx.app.ready()
  return ctx
}

async function get(url: string, userName?: string) {
  const headers = userName
    ? { authorization: `Bearer ${(await ctx!.authService.login({ userName, password: PASSWORD })).accessToken}` }
    : {}
  return ctx!.app.inject({ method: 'GET', url: `/api/v1${url}`, headers })
}

const ROUTES = [
  `/settlements/${EXAMPLE_BATCH_ID}`,
  `/settlements/${EXAMPLE_BATCH_ID}/transactions?type=I`,
  `/imports/${IMPORT_ID}/settlements`,
  `/settlements/${EXAMPLE_BATCH_ID}/export?type=transactions`,
]

describe('GET /settlements/{id}, /transactions and /imports/{id}/settlements', () => {
  it('answers the view of the attempt', async () => {
    await app()
    const res = await get(`/settlements/${EXAMPLE_BATCH_ID}`, 'analyst')
    expect(res.statusCode, res.body).toBe(200)
    expect(SettlementView.parse(res.json())).toEqual(exampleView())
  })

  it('answers a page of movements with settled derived from the attempt', async () => {
    await app()
    const res = await get(`/settlements/${EXAMPLE_BATCH_ID}/transactions?type=I&page=1&pageSize=50`, 'viewer')
    expect(res.statusCode, res.body).toBe(200)
    const page = SettlementTransactionsPage.parse(res.json())
    expect(page).toMatchObject({ batchId: EXAMPLE_BATCH_ID, type: 'I', page: 1, pageSize: 50, total: 1 })
    expect(page.items[0]!.settled).toBe(false)
  })

  it('answers the attempts of an import, an empty list without any', async () => {
    await app()
    const res = await get(`/imports/${IMPORT_ID}/settlements`, 'analyst')
    expect(res.statusCode, res.body).toBe(200)
    expect(ImportSettlements.parse(res.json())).toEqual({ importId: IMPORT_ID, currentBatchId: null, items: [] })
  })

  it('serves the reads to a user without reports.view', async () => {
    await app()
    expect((await get(`/settlements/${EXAMPLE_BATCH_ID}`, NO_REPORTS)).statusCode).toBe(200)
  })
})

describe('GET /accounts/{id}/settlements', () => {
  // Spec settlement "Settlements de una cuenta", "Filtros…" and "Alcance…" (settlements-browse "Contrato", D5).
  it('answers the page of the account to analyst and to viewer, without a permission of its own', async () => {
    await app()
    for (const userName of ['analyst', 'viewer', NO_REPORTS]) {
      const res = await get(`/accounts/${ACCOUNT_ID}/settlements?page=1&pageSize=50`, userName)
      expect(res.statusCode, res.body).toBe(200)
      expect(AccountSettlementsPage.parse(res.json())).toEqual({
        accountId: ACCOUNT_ID,
        page: 1,
        pageSize: 50,
        total: 2,
        items: [accountAttempt(122), accountAttempt(121)],
      })
    }
  })

  it('passes the filters to the service, processedAt as it comes and the settlement date by default', async () => {
    await app()
    await get(`/accounts/${ACCOUNT_ID}/settlements?status=paid&from=2026-10-01&to=2026-10-31`, 'analyst')
    await get(`/accounts/${ACCOUNT_ID}/settlements?dateField=processedAt&from=2026-10-20&pageSize=20`, 'analyst')
    expect(lastQueries.asked.accountSettlements).toEqual([
      { status: 'paid', dateField: 'settlementDate', from: '2026-10-01', to: '2026-10-31', page: 1, pageSize: 50 },
      { dateField: 'processedAt', from: '2026-10-20', page: 1, pageSize: 20 },
    ])
  })

  it('answers 401 unauthorized without a token', async () => {
    await app()
    const res = await get(`/accounts/${ACCOUNT_ID}/settlements`)
    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('answers the same 404 for an account of another merchant and for an unknown one', async () => {
    await app()
    const foreign = await get(`/accounts/${OTHER_ACCOUNT}/settlements`, 'viewer')
    const unknown = await get(`/accounts/${UNKNOWN}/settlements`, 'viewer')
    expect(foreign.statusCode).toBe(404)
    expect(foreign.json()).toEqual({ code: 'not_found', message: 'Account not found' })
    expect(unknown.statusCode).toBe(404)
    expect(unknown.json()).toEqual(foreign.json())
  })

  it('answers 400 validation_error for a bad id, status, date field, day, range or page size', async () => {
    await app()
    const bad = [
      '/accounts/not-a-uuid/settlements',
      `/accounts/${ACCOUNT_ID}/settlements?status=settled`,
      `/accounts/${ACCOUNT_ID}/settlements?dateField=createdAt`,
      `/accounts/${ACCOUNT_ID}/settlements?from=24/10/2026`,
      `/accounts/${ACCOUNT_ID}/settlements?from=2026-02-30`,
      `/accounts/${ACCOUNT_ID}/settlements?from=2026-10-24&to=2026-10-01`,
      `/accounts/${ACCOUNT_ID}/settlements?pageSize=501`,
      `/accounts/${ACCOUNT_ID}/settlements?cycle=E`,
    ]
    for (const url of bad) {
      const res = await get(url, 'analyst')
      expect(res.statusCode, url).toBe(400)
      expect(res.json().code, url).toBe('validation_error')
    }
    expect(lastQueries.asked.accountSettlements).toEqual([])
  })
})

describe('GET /settlements/{id}/export', () => {
  it('answers the CSV with its type, its attempt name and no-store, and audits the download', async () => {
    await app()
    const res = await get(`/settlements/${EXAMPLE_BATCH_ID}/export?type=transactions`, 'viewer')
    expect(res.statusCode, res.body).toBe(200)
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8')
    expect(res.headers['content-disposition']).toBe('attachment; filename="ProviderA-USD_B123_A1_transactions.csv"')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toBe('ID,Status\r\n911545593909470,SUC\r\n')
    expect(audit.entries).toHaveLength(1)
  })

  it('answers the RR and the summary by type', async () => {
    await app()
    const rr = await get(`/settlements/${EXAMPLE_BATCH_ID}/export?type=reserves`, 'analyst')
    expect(rr.body).toBe('ID,Description\r\n911545512345678,Batch 123\r\n')
    const summary = await get(`/settlements/${EXAMPLE_BATCH_ID}/export?type=summary`, 'analyst')
    expect(summary.headers['content-disposition']).toBe('attachment; filename="ProviderA-USD_B123_A1_summary.csv"')
    expect(summary.body.startsWith('Field,Value\r\n')).toBe(true)
  })

  it('answers 403 forbidden without reports.view before the scope, also for an unknown or foreign batch', async () => {
    await app()
    for (const batchId of [EXAMPLE_BATCH_ID, UNKNOWN, OTHER_BATCH]) {
      const res = await get(`/settlements/${batchId}/export?type=transactions`, NO_REPORTS)
      expect(res.statusCode).toBe(403)
      expect(res.json().code).toBe('forbidden')
    }
    expect(audit.entries).toEqual([])
  })

  it('answers 500 internal_error in JSON, without the CSV, when the download cannot be audited', async () => {
    await app()
    audit.failWith = new Error('audit down')
    const res = await get(`/settlements/${EXAMPLE_BATCH_ID}/export?type=transactions`, 'analyst')
    expect(res.statusCode).toBe(500)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.headers['content-disposition']).toBeUndefined()
    expect(res.json()).toEqual({ code: 'internal_error', message: 'Internal server error' })
  })
})

describe('errors of the four routes', () => {
  it('answers 401 unauthorized without a token', async () => {
    await app()
    for (const url of ROUTES) {
      const res = await get(url)
      expect(res.statusCode, url).toBe(401)
      expect(res.json().code).toBe('unauthorized')
    }
  })

  it('answers the same 404 for a batch outside the scope and for an unknown one', async () => {
    await app()
    for (const suffix of ['', '/transactions?type=E', '/export?type=summary']) {
      const foreign = await get(`/settlements/${OTHER_BATCH}${suffix}`, 'viewer')
      const unknown = await get(`/settlements/${UNKNOWN}${suffix}`, 'viewer')
      expect(foreign.statusCode).toBe(404)
      expect(foreign.json()).toEqual({ code: 'not_found', message: 'Settlement not found' })
      expect(unknown.json()).toEqual(foreign.json())
    }
    const imp = await get(`/imports/${UNKNOWN}/settlements`, 'viewer')
    expect(imp.statusCode).toBe(404)
    expect(imp.json()).toEqual({ code: 'not_found', message: 'Import not found' })
    expect(audit.entries).toEqual([])
  })

  it('answers 400 validation_error in JSON for a bad type, page size or id, without auditing', async () => {
    await app()
    const bad = [
      `/settlements/${EXAMPLE_BATCH_ID}/transactions`,
      `/settlements/${EXAMPLE_BATCH_ID}/transactions?type=X`,
      `/settlements/${EXAMPLE_BATCH_ID}/transactions?type=E&pageSize=501`,
      `/settlements/${EXAMPLE_BATCH_ID}/export`,
      `/settlements/${EXAMPLE_BATCH_ID}/export?type=pdf`,
      '/settlements/not-a-uuid',
      '/settlements/not-a-uuid/export?type=summary',
      '/imports/not-a-uuid/settlements',
    ]
    for (const url of bad) {
      const res = await get(url, 'analyst')
      expect(res.statusCode, url).toBe(400)
      expect(res.headers['content-type']).toMatch(/^application\/json/)
      expect(res.json().code).toBe('validation_error')
    }
    expect(audit.entries).toEqual([])
  })
})
