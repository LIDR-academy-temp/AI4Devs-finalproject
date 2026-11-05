import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ImportDetail, ImportListPage, type MappingConfirmation } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, SEED_PASSWORD } from './helpers.js'

// GET /imports over the seeded database (spec "Imports en curso", "Filtros" and "Paginación de imports en curso").
// Other open imports may exist (a run of Bruno or of the screenshots): every assertion is about the imports this file
// creates, never about the whole list. batch-split and legacy-provider only; nothing depends on batch-clean (#111).
const SAMPLES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/samples')
const PART1 = 'batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx'
const PART2 = 'batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx'
const LEGACY = 'legacy-provider/Legacy_ProviderC-Alt_batch.xlsx'
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
const REASON = { reason: 'Integration test cleanup' }

type User = 'analyst' | 'viewer' | 'admin'

let ctx: Awaited<ReturnType<typeof createTestApp>>
let uploadDir: string
const accountIds: Record<string, string> = {}
const tokens: Record<string, string> = {}
const userIds: Record<string, number> = {}
const created = new Set<string>()

function call(method: 'GET' | 'POST' | 'PUT', url: string, body?: object, user: User = 'analyst') {
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers: { authorization: `Bearer ${tokens[user]}` },
    ...(body === undefined ? {} : { payload: body }),
  })
}

async function upload(account: string, files: string[], user: User = 'analyst'): Promise<ImportDetail> {
  const form = new FormData()
  for (const file of files) {
    form.append('files', new Blob([new Uint8Array(readFileSync(path.join(SAMPLES, file)))]), path.basename(file))
  }
  const response = new Response(form)
  const res = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/accounts/${accountIds[account]}/imports`,
    headers: {
      authorization: `Bearer ${tokens[user]}`,
      'content-type': response.headers.get('content-type') as string,
    },
    payload: Buffer.from(await response.arrayBuffer()),
  })
  expect(res.statusCode, res.body).toBe(201)
  const detail = ImportDetail.parse(res.json())
  created.add(detail.importId)
  return detail
}

function proposalOf(detail: ImportDetail): MappingConfirmation {
  return {
    sheets: detail.files.flatMap((file) =>
      file.sheets.map((sheet) => ({
        sheetId: sheet.sheetId,
        kind: sheet.proposed.kind ?? 'ignore',
        cycle: sheet.proposed.cycle,
        statusId: sheet.proposed.statusId,
        columns: sheet.columns.flatMap((c) =>
          c.targetField === null ? [] : [{ sourceColumn: c.sourceColumn, targetField: c.targetField }],
        ),
      })),
    ),
  }
}

async function mapped(account: string, files: string[]): Promise<ImportDetail> {
  const detail = await upload(account, files)
  const res = await call('PUT', `/imports/${detail.importId}/mapping`, proposalOf(detail))
  expect(res.statusCode, res.body).toBe(200)
  return ImportDetail.parse(res.json())
}

async function list(query: string, user: User = 'analyst'): Promise<ImportListPage> {
  const res = await call('GET', `/imports${query}`, undefined, user)
  expect(res.statusCode, res.body).toBe(200)
  return ImportListPage.parse(res.json())
}

/** Only the imports created here, in the order of the answer. */
const ours = (page: ImportListPage) => page.items.filter((i) => created.has(i.importId)).map((i) => i.importId)

async function removeCreated(): Promise<void> {
  const importIds = [...created]
  if (importIds.length === 0) return
  const { prisma } = ctx
  const inImports = { file: { importId: { in: importIds } } }
  await prisma.auditLog.deleteMany({ where: { entityType: 'Import', entityId: { in: importIds } } })
  await prisma.importRow.deleteMany({ where: { sheet: inImports } })
  await prisma.importSheetColumnMap.deleteMany({ where: { sheet: inImports } })
  await prisma.importSheet.deleteMany({ where: inImports })
  await prisma.importFile.deleteMany({ where: { importId: { in: importIds } } })
  await prisma.import.deleteMany({ where: { importId: { in: importIds } } })
  created.clear()
}

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-list-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  for (const a of await ctx.prisma.account.findMany({ select: { accountId: true, name: true } }))
    accountIds[a.name] = a.accountId
  for (const userName of ['analyst', 'viewer', 'admin'] as const) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    tokens[userName] = res.json().accessToken
    userIds[userName] = (await ctx.prisma.user.findUniqueOrThrow({ where: { userName } })).userId
  }
})

afterAll(async () => {
  if (ctx) {
    await removeCreated()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

describe('GET /imports: open imports of the scope (spec "Imports en curso")', () => {
  it('lists the open ones, latest update first, with the hierarchy, and leaves the cancelled one out', async () => {
    const uploaded = await upload('ProviderA-USD', [PART1])
    const cancelled = await upload('ProviderA-USD', [PART1])
    expect((await call('POST', `/imports/${cancelled.importId}/cancel`, REASON)).statusCode).toBe(200)
    const legacy = await mapped('ProviderC-Alt', [LEGACY])

    const page = await list('')

    expect(ours(page)).toEqual([legacy.importId, uploaded.importId])
    const item = page.items.find((i) => i.importId === legacy.importId)
    expect(item).toMatchObject({
      status: 'mapped',
      fileCount: 1,
      createdBy: { userId: userIds.analyst, userName: 'analyst' },
      account: { id: accountIds['ProviderC-Alt'], name: 'ProviderC-Alt' },
      provider: { id: 201, name: 'Provider C' },
      merchant: { id: 2, name: 'Merchant B' },
    })
    expect(page.items.every((i) => i.status !== 'cancelled' && i.status !== 'processed')).toBe(true)

    expect(ours(await list('?status=cancelled'))).toEqual([cancelled.importId])
    expect(ours(await list(`?accountId=${accountIds['ProviderC-Alt']}`))).toEqual([legacy.importId])
    expect(ours(await list('?merchantId=2&providerId=201'))).toEqual([legacy.importId])
  })

  it('viewer sees the imports of Merchant A only', async () => {
    const own = await upload('ProviderA-USD', [PART1])
    const foreign = await upload('ProviderC-Alt', [LEGACY])

    const ids = ours(await list('', 'viewer'))

    expect(ids).toContain(own.importId)
    expect(ids).not.toContain(foreign.importId)
  })

  it('mine=true keeps the imports of the caller', async () => {
    const mine = await upload('ProviderA-USD', [PART1])
    const admins = await upload('ProviderA-USD', [PART1], 'admin')

    expect(ours(await list('?mine=true'))).toContain(mine.importId)
    expect(ours(await list('?mine=true'))).not.toContain(admins.importId)
    expect(ours(await list('?mine=false'))).toEqual(expect.arrayContaining([mine.importId, admins.importId]))
  })

  it('an analyzed import carries its counts (batch-split against its expected.json)', async () => {
    const detail = await mapped('ProviderA-USD', [PART1, PART2])
    expect((await call('POST', `/imports/${detail.importId}/analyze`)).statusCode).toBe(200)

    const item = (await list('?status=analyzed')).items.find((i) => i.importId === detail.importId)

    expect(item).toMatchObject({ analyzedAt: expect.any(String), rowsTotal: 783, rowsMatched: 780, rowsUnmatched: 0 })
    expect(item?.fileCount).toBe(2)
  }, 120_000)
})

describe('GET /imports: filters and pages (spec "Filtros" and "Paginación de imports en curso")', () => {
  it('answers 404 with the same body for a merchant, provider or account outside the scope or unknown', async () => {
    const unknown = await call('GET', `/imports?accountId=${UNKNOWN_UUID}`)
    expect(unknown.statusCode).toBe(404)
    expect(unknown.json().code).toBe('not_found')

    for (const query of ['?merchantId=2', '?providerId=201', `?accountId=${accountIds['ProviderC-Alt']}`]) {
      const res = await call('GET', `/imports${query}`, undefined, 'viewer')
      expect(res.statusCode, query).toBe(404)
      expect(res.body).toBe(unknown.body)
    }
  })

  it('pages over a stable order without repeating an import, with the total of every match', async () => {
    const mine = [
      await upload('ProviderA-USD', [PART1]),
      await upload('ProviderA-USD', [PART1]),
      await upload('ProviderA-USD', [PART1]),
    ].map((d) => d.importId)
    const query = `?accountId=${accountIds['ProviderA-USD']}&mine=true&status=uploaded`
    const all = await list(query)
    const seen: string[] = []

    for (let page = 1; page <= Math.ceil(all.total / 2); page++) {
      const answer = await list(`${query}&pageSize=2&page=${page}`)
      expect(answer.total).toBe(all.total)
      expect(answer.items.length).toBeLessThanOrEqual(2)
      seen.push(...answer.items.map((i) => i.importId))
    }

    expect(new Set(seen).size).toBe(seen.length)
    expect(seen).toEqual(all.items.map((i) => i.importId))
    expect(seen).toEqual(expect.arrayContaining(mine))
  })
})
