import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ImportDetail, ImportSummary } from '@recon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import {
  ACCOUNT_IDS,
  FakeWorkbookReader,
  InMemoryFileStore,
  InMemoryImportRepository,
  InMemoryMatchingRulesRepository,
  SAMPLE_FILES,
  sequentialIds,
} from '../application/__fakes__/in-memory.js'
import { ImportService } from '../application/import-service.js'
import { XlsxWorkbookReader } from '../infrastructure/xlsx-workbook-reader.js'

const SAMPLES = path.resolve(import.meta.dirname, '../../../../../data/samples')
const REAL_BATCH_CLEAN = readFileSync(path.join(SAMPLES, 'batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx'))
const A_USD = ACCOUNT_IDS['ProviderA-USD']
const C_USD = ACCOUNT_IDS['ProviderC-USD']
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'

interface Part {
  name: string
  bytes: Uint8Array
}

let ctx: Awaited<ReturnType<typeof buildTestApp>>
let files: InMemoryFileStore
let imports: InMemoryImportRepository

beforeEach(async () => {
  files = new InMemoryFileStore()
  imports = new InMemoryImportRepository()
  // The fake reader knows the fixture bytes; the real reader is used for the real batch-clean upload.
  const fake = new FakeWorkbookReader()
  const real = new XlsxWorkbookReader()
  const service = new ImportService({
    imports,
    files,
    reader: {
      describe: (bytes, fileName) =>
        bytes.length === REAL_BATCH_CLEAN.length ? real.describe(bytes, fileName) : fake.describe(bytes, fileName),
    },
    rules: new InMemoryMatchingRulesRepository(),
    ids: sequentialIds(),
    log: { error: vi.fn(), warn: vi.fn() },
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

/** Serialises a native FormData exactly as a browser would send it. */
async function multipart(parts: Part[]): Promise<{ payload: Buffer; contentType: string }> {
  const form = new FormData()
  for (const part of parts) form.append('files', new Blob([new Uint8Array(part.bytes)]), part.name)
  const response = new Response(form)
  return {
    payload: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') as string,
  }
}

async function upload(url: string, parts: Part[], userName: string | null = 'analyst') {
  const { payload, contentType } = await multipart(parts)
  const headers: Record<string, string> = { 'content-type': contentType }
  if (userName) headers.authorization = `Bearer ${await tokenOf(userName)}`
  return ctx.app.inject({ method: 'POST', url: `/api/v1${url}`, headers, payload })
}

async function call(method: 'GET' | 'DELETE', url: string, userName: string | null = 'analyst') {
  const headers = userName ? { authorization: `Bearer ${await tokenOf(userName)}` } : {}
  return ctx.app.inject({ method, url: `/api/v1${url}`, headers })
}

const sample = (key: keyof typeof SAMPLE_FILES, name?: string): Part => ({
  name: name ?? SAMPLE_FILES[key].fileName,
  bytes: SAMPLE_FILES[key].bytes,
})

const BOUNDARY = 'recon-test-boundary'
const CRLF = '\r\n'

/** Header block of a multipart part, up to and including the blank line before its content. */
function partHeader(disposition: string): string {
  return [
    `--${BOUNDARY}`,
    `Content-Disposition: form-data; ${disposition}`,
    'Content-Type: application/octet-stream',
    '',
    '',
  ].join(CRLF)
}

/** A multipart body written by hand, for shapes FormData cannot produce (missing filename, truncated body). */
function rawBody(chunks: (string | Uint8Array)[]): Buffer {
  return Buffer.concat(chunks.map((c) => (typeof c === 'string' ? Buffer.from(c, 'latin1') : Buffer.from(c))))
}

async function uploadRaw(url: string, body: Buffer) {
  return ctx.app.inject({
    method: 'POST',
    url: `/api/v1${url}`,
    headers: {
      authorization: `Bearer ${await tokenOf('analyst')}`,
      'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
    },
    payload: body,
  })
}

describe('POST /api/v1/accounts/{accountId}/imports: authentication and permission', () => {
  it('answers 401 unauthorized without a token', async () => {
    const res = await upload(`/accounts/${A_USD}/imports`, [sample('batchClean')], null)

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('answers 403 forbidden for viewer, who lacks settlement.process', async () => {
    const res = await upload(`/accounts/${A_USD}/imports`, [sample('batchClean')], 'viewer')

    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('forbidden')
  })
})

describe('POST /api/v1/accounts/{accountId}/imports: request validation', () => {
  it('answers 400 validation_error without any files part', async () => {
    const res = await upload(`/accounts/${A_USD}/imports`, [])

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
    expect(files.paths()).toEqual([])
  })

  it('answers 400 validation_error for a JSON body instead of multipart', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/accounts/${A_USD}/imports`,
      headers: { authorization: `Bearer ${await tokenOf('analyst')}` },
      payload: { files: [] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })

  it('answers 400 unsupported_file_type for a .csv, naming the file, and keeps nothing', async () => {
    const res = await upload(`/accounts/${A_USD}/imports`, [
      sample('batchClean'),
      { name: 'batch.csv', bytes: new TextEncoder().encode('ID,Amount\n1,2') },
    ])

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ code: 'unsupported_file_type', details: { fileName: 'batch.csv' } })
    expect(files.paths()).toEqual([])
    expect(await imports.listImports({ merchantIds: [1, 2] }, A_USD)).toEqual([])
  })

  it('answers 400 unsupported_file_type for a binary part without filename, draining the rest', async () => {
    const body = rawBody([
      partHeader('name="files"'),
      new Uint8Array([0x50, 0x4b, 3, 4, 9]),
      CRLF,
      partHeader(`name="files"; filename="${SAMPLE_FILES.batchClean.fileName}"`),
      SAMPLE_FILES.batchClean.bytes,
      `${CRLF}--${BOUNDARY}--${CRLF}`,
    ])

    const res = await uploadRaw(`/accounts/${A_USD}/imports`, body)

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ code: 'unsupported_file_type', details: { fileName: 'upload' } })
    expect(files.paths()).toEqual([])
    expect(await imports.listImports({ merchantIds: [1, 2] }, A_USD)).toEqual([])
  })

  it('answers 400 too_many_files for eleven parts', async () => {
    const parts = Array.from({ length: 11 }, (_, i) => ({
      name: `part${i}.xlsx`,
      bytes: new Uint8Array([0x50, 0x4b, 3, 4, i]),
    }))

    const res = await upload(`/accounts/${A_USD}/imports`, parts)

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('too_many_files')
    expect(files.paths()).toEqual([])
  })

  it('answers 422 file_unreadable for a .xlsx whose content is an OLE container', async () => {
    const res = await upload(`/accounts/${A_USD}/imports`, [
      { name: 'old.xlsx', bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) },
    ])

    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ code: 'file_unreadable', details: { fileName: 'old.xlsx' } })
    expect(files.paths()).toEqual([])
  })

  it('answers 400 validation_error for an accountId that is not a UUID', async () => {
    const res = await upload('/accounts/not-a-uuid/imports', [sample('batchClean')])

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })
})

describe('POST /api/v1/accounts/{accountId}/imports: happy paths', () => {
  it('creates the import from the real batch-clean file and answers 201 with a valid ImportDetail', async () => {
    const res = await upload(`/accounts/${A_USD}/imports`, [
      { name: 'Recon_Template_ProviderA-USD_batch-clean.xlsx', bytes: REAL_BATCH_CLEAN },
    ])

    expect(res.statusCode).toBe(201)
    const detail = ImportDetail.parse(res.json())
    expect(detail).toMatchObject({
      accountId: A_USD,
      status: 'uploaded',
      fileCount: 1,
      createdBy: { userName: 'analyst' },
    })
    expect(detail.files[0]).toMatchObject({
      fileName: 'Recon_Template_ProviderA-USD_batch-clean.xlsx',
      sizeBytes: 31510,
      sha256: 'c46857d3b6580aba6daf6b63b66e67583b399cd356a71bd16e659bc252128352',
    })
    expect(detail.files[0]?.sheets.map((s) => [s.sheetName, s.rowCount])).toEqual([
      ['APP', 340],
      ['DEC', 110],
      ['CHB', 3],
      ['REF', 7],
      ['RDR', 3],
      ['RR', 320],
      ['Duplicate Corrections', 0],
      ['CHB Alerts', 0],
      ['Other Fees', 2],
      ['Settings', 21],
    ])
    const app = detail.files[0]?.sheets[0]
    expect(app?.proposed).toEqual({
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
      statusName: 'Successful',
      source: 'global',
    })
    expect(app?.preview[0]).toEqual({ ID: '252570479111759', Amount: '16.22', Currency: 'USD' })
    expect(detail.readiness.canAnalyze).toBe(true)
    expect(files.paths()).toEqual([`imports/${detail.importId}/${detail.files[0]?.fileId}.xlsx`])
  })

  it('groups two parts in one import', async () => {
    const res = await upload(`/accounts/${A_USD}/imports`, [sample('part1'), sample('part2')])

    expect(res.statusCode).toBe(201)
    const detail = ImportDetail.parse(res.json())
    expect(detail.files.map((f) => f.fileName)).toEqual([SAMPLE_FILES.part1.fileName, SAMPLE_FILES.part2.fileName])
  })

  it('answers 404 not_found for an unknown account, keeping nothing (the scope case is covered by the service tests)', async () => {
    const res = await upload(`/accounts/${UNKNOWN_UUID}/imports`, [sample('batchClean')])

    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ code: 'not_found', message: 'Account not found' })
    expect(files.paths()).toEqual([])
  })
})

describe('files of an import', () => {
  let importId: string
  let part1FileId: string

  beforeEach(async () => {
    const res = await upload(`/accounts/${A_USD}/imports`, [sample('part1')])
    expect(res.statusCode).toBe(201)
    const detail = ImportDetail.parse(res.json())
    importId = detail.importId
    part1FileId = detail.files[0]?.fileId as string
  })

  it('POST /imports/{id}/files adds a part and answers 200 with the recalculated detail', async () => {
    const res = await upload(`/imports/${importId}/files`, [sample('part2')])

    expect(res.statusCode).toBe(200)
    const detail = ImportDetail.parse(res.json())
    expect(detail.fileCount).toBe(2)
    expect(detail.files[0]?.fileId).toBe(part1FileId)
  })

  it('POST /imports/{id}/files answers 409 duplicate_file naming the stored file', async () => {
    const res = await upload(`/imports/${importId}/files`, [sample('part1', 'copy.xlsx')])

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({
      code: 'duplicate_file',
      details: { fileId: part1FileId, fileName: SAMPLE_FILES.part1.fileName },
    })
    expect(ImportDetail.parse((await call('GET', `/imports/${importId}`)).json()).fileCount).toBe(1)
  })

  it('DELETE /imports/{id}/files/{fileId} answers 200 with the remaining files', async () => {
    const added = ImportDetail.parse((await upload(`/imports/${importId}/files`, [sample('part2')])).json())
    const part2FileId = added.files[1]?.fileId as string

    const res = await call('DELETE', `/imports/${importId}/files/${part2FileId}`)

    expect(res.statusCode).toBe(200)
    expect(ImportDetail.parse(res.json()).files.map((f) => f.fileId)).toEqual([part1FileId])
  })

  it('DELETE answers 404 not_found for an unknown file and viewer gets 403', async () => {
    expect((await call('DELETE', `/imports/${importId}/files/${UNKNOWN_UUID}`)).statusCode).toBe(404)
    expect((await call('DELETE', `/imports/${importId}/files/${part1FileId}`, 'viewer')).statusCode).toBe(403)
  })

  it('answers 409 import_not_editable once the import left uploaded/mapped', async () => {
    imports.setStatus(importId, 'analyzed')

    const add = await upload(`/imports/${importId}/files`, [sample('part2')])
    const remove = await call('DELETE', `/imports/${importId}/files/${part1FileId}`)

    expect(add.statusCode).toBe(409)
    expect(add.json()).toMatchObject({ code: 'import_not_editable', details: { status: 'analyzed' } })
    expect(remove.statusCode).toBe(409)
  })
})

describe('GET /api/v1/imports/{importId} and GET /api/v1/accounts/{accountId}/imports', () => {
  it('returns the same body the upload returned', async () => {
    const created = ImportDetail.parse((await upload(`/accounts/${A_USD}/imports`, [sample('batchClean')])).json())

    const res = await call('GET', `/imports/${created.importId}`, 'viewer')

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(created)
  })

  it('lists the imports of the account with their file count, filtered by status', async () => {
    const created = ImportDetail.parse(
      (await upload(`/accounts/${A_USD}/imports`, [sample('part1'), sample('part2')])).json(),
    )

    const all = await call('GET', `/accounts/${A_USD}/imports`, 'viewer')
    const uploaded = await call('GET', `/accounts/${A_USD}/imports?status=uploaded`)
    const processed = await call('GET', `/accounts/${A_USD}/imports?status=processed`)

    expect(all.statusCode).toBe(200)
    expect(
      z
        .array(ImportSummary)
        .parse(all.json())
        .map((i) => [i.importId, i.fileCount]),
    ).toEqual([[created.importId, 2]])
    expect(uploaded.json()).toHaveLength(1)
    expect(processed.json()).toEqual([])
    expect(all.json()[0]).not.toHaveProperty('files')
  })

  it('answers 400 validation_error for an unknown status and for a malformed importId', async () => {
    expect((await call('GET', `/accounts/${A_USD}/imports?status=nope`)).json().code).toBe('validation_error')
    expect((await call('GET', '/imports/not-a-uuid')).statusCode).toBe(400)
  })

  it('answers 404 not_found outside the scope, identical to an unknown id', async () => {
    const created = ImportDetail.parse(
      (await upload(`/accounts/${ACCOUNT_IDS['ProviderC-Alt']}/imports`, [sample('legacy')])).json(),
    )

    const outside = await call('GET', `/imports/${created.importId}`, 'viewer')
    const unknown = await call('GET', `/imports/${UNKNOWN_UUID}`, 'viewer')
    const account = await call('GET', `/accounts/${C_USD}/imports`, 'viewer')

    expect(outside.statusCode).toBe(404)
    expect(outside.body).toBe(unknown.body)
    expect(account.statusCode).toBe(404)
    expect(account.json().code).toBe('not_found')
  })
})
