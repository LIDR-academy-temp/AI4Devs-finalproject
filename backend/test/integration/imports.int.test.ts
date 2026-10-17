import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ImportDetail, ImportSummary } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTestApp, SEED_PASSWORD } from './helpers.js'

// Oracle: data/samples (README of the folder) and the seed: ProviderA-USD has no rule set, ProviderC-Alt
// is linked to "Provider C legacy"; viewer sees merchant 1 only; analyst has settlement.process.
const SAMPLES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/samples')
const BATCH_CLEAN = 'batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx'
const PART1 = 'batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx'
const PART2 = 'batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx'
const LEGACY = 'legacy-provider/Legacy_ProviderC-Alt_batch.xlsx'
const BATCH_CLEAN_SHA256 = 'c46857d3b6580aba6daf6b63b66e67583b399cd356a71bd16e659bc252128352'
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
const MIB = 1024 * 1024

interface Part {
  name: string
  bytes: Uint8Array
}

let ctx: Awaited<ReturnType<typeof createTestApp>>
let uploadDir: string
const accountIds: Record<string, string> = {}
const tokens: Record<string, string> = {}
const createdImportIds = new Set<string>()

function samplePart(relative: string): Part {
  return { name: path.basename(relative), bytes: readFileSync(path.join(SAMPLES, relative)) }
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

async function upload(url: string, parts: Part[], user: 'analyst' | 'viewer' = 'analyst') {
  const { payload, contentType } = await multipart(parts)
  const res = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1${url}`,
    headers: { authorization: `Bearer ${tokens[user]}`, 'content-type': contentType },
    payload,
  })
  if (res.statusCode === 201) createdImportIds.add(res.json().importId)
  return res
}

function call(method: 'GET' | 'DELETE', url: string, user: 'analyst' | 'viewer' = 'analyst') {
  return ctx.app.inject({ method, url: `/api/v1${url}`, headers: { authorization: `Bearer ${tokens[user]}` } })
}

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-imports-int-'))
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
})

afterAll(async () => {
  if (ctx) {
    const { prisma } = ctx
    const importIds = [...createdImportIds]
    if (importIds.length > 0) {
      await prisma.importSheetColumnMap.deleteMany({ where: { sheet: { file: { importId: { in: importIds } } } } })
      await prisma.importSheet.deleteMany({ where: { file: { importId: { in: importIds } } } })
      await prisma.importFile.deleteMany({ where: { importId: { in: importIds } } })
      await prisma.import.deleteMany({ where: { importId: { in: importIds } } })
    }
    await ctx.app.close()
    await prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

describe('POST /api/v1/accounts/{id}/imports with batch-clean (issue #4, criterion 1)', () => {
  it('creates the import in uploaded with the file, ten sheets, the global proposal and readiness, and persists it whole', async () => {
    const res = await upload(`/accounts/${accountIds['ProviderA-USD']}/imports`, [samplePart(BATCH_CLEAN)])

    expect(res.statusCode).toBe(201)
    const detail = ImportDetail.parse(res.json())
    expect(detail).toMatchObject({ accountId: accountIds['ProviderA-USD'], status: 'uploaded', fileCount: 1 })
    expect(detail.createdBy.userName).toBe('analyst')
    const file = detail.files[0]
    expect(file).toMatchObject({ fileName: path.basename(BATCH_CLEAN), sizeBytes: 31510, sha256: BATCH_CLEAN_SHA256 })
    expect(
      file?.sheets.map((s) => [
        s.sheetName,
        s.rowCount,
        s.proposed.kind,
        s.proposed.cycle,
        s.proposed.statusId,
        s.proposed.source,
      ]),
    ).toEqual([
      ['APP', 340, 'transactions', 'E', 2, 'global'],
      ['DEC', 110, 'transactions', 'E', 3, 'global'],
      ['CHB', 3, 'transactions', 'I', 4, 'global'],
      ['REF', 7, 'transactions', 'I', 5, 'global'],
      ['RDR', 3, 'transactions', 'I', 6, 'global'],
      ['RR', 320, 'transactions', 'R', null, 'global'],
      ['Duplicate Corrections', 0, 'ignore', null, null, 'global'],
      ['CHB Alerts', 0, 'ignore', null, null, 'global'],
      ['Other Fees', 2, 'batch_fees', null, null, 'global'],
      ['Settings', 21, 'ignore', null, null, 'global'],
    ])
    expect(file?.sheets[0]?.columns).toEqual([
      { sourceColumn: 'ID', targetField: 'transactionId', source: 'global' },
      { sourceColumn: 'Amount', targetField: 'amount', source: 'global' },
      { sourceColumn: 'Currency', targetField: 'currency', source: 'global' },
    ])
    expect(file?.sheets[0]?.preview[0]).toEqual({ ID: '252570479111759', Amount: '16.22', Currency: 'USD' })
    expect(file?.sheets[9]?.hidden).toBe(true)
    expect(detail.readiness).toMatchObject({ canAnalyze: true, missing: [] })

    // Rows: Import + ImportFile + ImportSheet (snapshot, unconfirmed), no column maps yet.
    const row = await ctx.prisma.import.findUnique({
      where: { importId: detail.importId },
      include: { files: { include: { sheets: true } } },
    })
    expect(row?.status).toBe('uploaded')
    expect(row?.files).toHaveLength(1)
    expect(row?.files[0]?.storagePath).toBe(`imports/${detail.importId}/${file?.fileId}.xlsx`)
    expect(row?.files[0]?.storagePath).not.toContain('Recon_Template')
    expect(row?.files[0]?.sheets).toHaveLength(10)
    expect(row?.files[0]?.sheets.every((s) => s.mappingConfirmed === false)).toBe(true)
    expect(row?.files[0]?.sheets.find((s) => s.sheetName === 'CHB')).toMatchObject({
      kind: 'transactions',
      cycle: 'I',
      statusId: 4,
      rowCount: 3,
    })
    expect(await ctx.prisma.importSheetColumnMap.count({ where: { sheet: { fileId: file?.fileId } } })).toBe(0)

    // The bytes on disk are the bytes received.
    const stored = readFileSync(path.join(uploadDir, row?.files[0]?.storagePath as string))
    expect(createHash('sha256').update(stored).digest('hex')).toBe(BATCH_CLEAN_SHA256)
    expect(existsSync(path.join(uploadDir, 'tmp'))).toBe(true)
  })

  it('GET /imports/{id} returns the same body, and the account list includes it with its file count', async () => {
    const created = ImportDetail.parse(
      (await upload(`/accounts/${accountIds['ProviderA-USD']}/imports`, [samplePart(BATCH_CLEAN)])).json(),
    )

    const detail = await call('GET', `/imports/${created.importId}`, 'viewer')
    const list = await call('GET', `/accounts/${accountIds['ProviderA-USD']}/imports?status=uploaded`, 'viewer')

    expect(detail.statusCode).toBe(200)
    expect(detail.json()).toEqual(created)
    expect(list.statusCode).toBe(200)
    const summaries = z.array(ImportSummary).parse(list.json())
    expect(summaries.find((i) => i.importId === created.importId)).toMatchObject({ fileCount: 1, status: 'uploaded' })
    expect(summaries[0]).not.toHaveProperty('files')
  })
})

describe('batch-split in two files (criterion 2)', () => {
  it('groups both parts, rejects part1 again by hash naming it, and removes part2 from the database and the disk', async () => {
    const created = await upload(`/accounts/${accountIds['ProviderA-USD']}/imports`, [
      samplePart(PART1),
      samplePart(PART2),
    ])
    expect(created.statusCode).toBe(201)
    const detail = ImportDetail.parse(created.json())
    expect(detail.files.map((f) => f.fileName)).toEqual([path.basename(PART1), path.basename(PART2)])
    expect(detail.files[0]?.sheets.find((s) => s.sheetName === 'APP')?.rowCount).toBe(340)
    expect(detail.files[1]?.sheets.find((s) => s.sheetName === 'RR')?.rowCount).toBe(320)
    expect(detail.readiness.canAnalyze).toBe(true)

    const duplicate = await upload(`/imports/${detail.importId}/files`, [samplePart(PART1)])
    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json()).toMatchObject({
      code: 'duplicate_file',
      details: { fileId: detail.files[0]?.fileId, fileName: path.basename(PART1) },
    })
    expect(ImportDetail.parse((await call('GET', `/imports/${detail.importId}`)).json()).fileCount).toBe(2)

    const part2 = detail.files[1]
    const part2Path = path.join(uploadDir, `imports/${detail.importId}/${part2?.fileId}.xlsx`)
    expect(existsSync(part2Path)).toBe(true)
    const removed = await call('DELETE', `/imports/${detail.importId}/files/${part2?.fileId}`)
    expect(removed.statusCode).toBe(200)
    expect(ImportDetail.parse(removed.json()).files.map((f) => f.fileId)).toEqual([detail.files[0]?.fileId])
    expect(existsSync(part2Path)).toBe(false)
    expect(await ctx.prisma.importSheet.count({ where: { fileId: part2?.fileId } })).toBe(0)
  })
})

describe('the same file in two imports (spec "Varios archivos por import", HU1 CA8)', () => {
  it('accepts batch-clean again in a new import of the same account: two 201 with distinct importId', async () => {
    const url = `/accounts/${accountIds['ProviderA-USD']}/imports`
    const first = await upload(url, [samplePart(BATCH_CLEAN)])
    const second = await upload(url, [samplePart(BATCH_CLEAN)])

    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
    const a = ImportDetail.parse(first.json())
    const b = ImportDetail.parse(second.json())
    expect(a.importId).not.toBe(b.importId)
    expect([a.files[0]?.sha256, b.files[0]?.sha256]).toEqual([BATCH_CLEAN_SHA256, BATCH_CLEAN_SHA256])
    const stored = await ctx.prisma.importFile.count({
      where: { sha256: BATCH_CLEAN_SHA256, importId: { in: [a.importId, b.importId] } },
    })
    expect(stored).toBe(2)
  })
})

describe('legacy-provider on ProviderC-Alt (criterion 3)', () => {
  it('applies the account rule set and recognises CHB 2 in the status column', async () => {
    const res = await upload(`/accounts/${accountIds['ProviderC-Alt']}/imports`, [samplePart(LEGACY)])

    expect(res.statusCode).toBe(201)
    const detail = ImportDetail.parse(res.json())
    const sheets = detail.files[0]?.sheets ?? []
    expect(
      sheets.map((s) => [s.sheetName, s.proposed.kind, s.proposed.cycle, s.proposed.statusId, s.proposed.source]),
    ).toEqual([
      ['Summary', 'ignore', null, null, 'account'],
      ['TRX', 'transactions', 'E', null, 'account'],
      ['Fail', 'transactions', 'E', 3, 'account'],
      ['CB', 'transactions', 'I', null, 'account'],
    ])
    const cb = sheets.find((s) => s.sheetName === 'CB')
    expect(cb?.columns).toEqual([
      { sourceColumn: 'Merchant Order No#', targetField: 'transactionId', source: 'account' },
      {
        sourceColumn: 'Order Status',
        targetField: 'status',
        source: 'account',
        statusValues: [{ value: 'CHB 2', statusId: 4, statusName: 'Chargeback', excludeAmount: true }],
      },
      { sourceColumn: 'Amount USD', targetField: 'amount', source: 'account' },
    ])
    expect(detail.readiness.canAnalyze).toBe(true)
  })
})

describe('rejected uploads (criterion 4), permission and scope', () => {
  it('answers 400 for a .csv and for a 21 MiB .xlsx without creating any import', async () => {
    const before = await ctx.prisma.import.count()

    const csv = await upload(`/accounts/${accountIds['ProviderA-USD']}/imports`, [
      { name: 'batch.csv', bytes: new TextEncoder().encode('ID,Amount\n1,2') },
    ])
    const huge = new Uint8Array(21 * MIB)
    huge.set([0x50, 0x4b, 0x03, 0x04])
    const tooLarge = await upload(`/accounts/${accountIds['ProviderA-USD']}/imports`, [
      { name: 'huge.xlsx', bytes: huge },
    ])

    expect(csv.statusCode).toBe(400)
    expect(csv.json()).toMatchObject({ code: 'unsupported_file_type', details: { fileName: 'batch.csv' } })
    expect(tooLarge.statusCode).toBe(400)
    expect(tooLarge.json()).toMatchObject({ code: 'file_too_large', details: { fileName: 'huge.xlsx' } })
    expect(await ctx.prisma.import.count()).toBe(before)
  })

  it('answers 403 forbidden for viewer and 404 not_found for an account outside the scope, identical to an unknown one', async () => {
    const forbidden = await upload(
      `/accounts/${accountIds['ProviderA-USD']}/imports`,
      [samplePart(BATCH_CLEAN)],
      'viewer',
    )
    const outside = await call('GET', `/accounts/${accountIds['ProviderC-USD']}/imports`, 'viewer')
    const unknown = await call('GET', `/accounts/${UNKNOWN_UUID}/imports`, 'viewer')

    expect(forbidden.statusCode).toBe(403)
    expect(forbidden.json().code).toBe('forbidden')
    expect(outside.statusCode).toBe(404)
    expect(outside.body).toBe(unknown.body)
  })

  it('answers 404 for an import of another merchant, identical to an unknown import', async () => {
    const created = ImportDetail.parse(
      (await upload(`/accounts/${accountIds['ProviderC-Alt']}/imports`, [samplePart(LEGACY)])).json(),
    )

    const outside = await call('GET', `/imports/${created.importId}`, 'viewer')
    const unknown = await call('GET', `/imports/${UNKNOWN_UUID}`, 'viewer')

    expect(outside.statusCode).toBe(404)
    expect(outside.body).toBe(unknown.body)
  })
})

describe('a template saved by Excel desktop (data/samples/excel-real)', () => {
  it('uploads like the openpyxl samples and notes the numeric ID that lost precision (design D2)', async () => {
    const res = await upload(`/accounts/${accountIds['ProviderA-USD']}/imports`, [
      samplePart('excel-real/excel-real-sample.xlsx'),
    ])

    expect(res.statusCode).toBe(201)
    const detail = ImportDetail.parse(res.json())
    const app = detail.files[0]?.sheets.find((s) => s.sheetName === 'APP')
    expect(app).toMatchObject({
      rowCount: 14,
      proposed: { kind: 'transactions', cycle: 'E', statusId: 2, source: 'global' },
    })
    expect(app?.preview[0]).toEqual({ ID: '403066894472190', Amount: '10', Currency: 'USD' })
    expect(detail.readiness.canAnalyze).toBe(true)
    expect(detail.readiness.notes).toContainEqual({
      sheetId: app?.sheetId,
      sheetName: 'APP',
      message: expect.stringMatching(/^1 numeric ID cell.*(scientific notation|15 digits).*rejected/),
    })
  })
})
