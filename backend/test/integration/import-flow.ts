import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ImportDetail, type MappingConfirmation } from '@recon/shared'
import { expect } from 'vitest'
import { Prisma } from '../../src/generated/prisma/client.js'
import type { createTestApp } from './helpers.js'
import { SEED_PASSWORD } from './helpers.js'

// Upload → confirm the proposal → analyze through the API, and the cleanup of what a flow leaves behind (imports with
// their runs, findings, occurrences and audit entries). Shared by the validation-runs suites.
export const SAMPLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/samples')

export type SampleName = 'batch-clean' | 'batch-split' | 'batch-issues' | 'batch-blocked' | 'legacy-provider'

export const SAMPLE_FILES: Record<SampleName, { account: string; files: string[] }> = {
  'batch-clean': { account: 'ProviderA-USD', files: ['batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx'] },
  'batch-split': {
    account: 'ProviderA-USD',
    files: [
      'batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx',
      'batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx',
    ],
  },
  'batch-issues': {
    account: 'ProviderB-Main',
    files: ['batch-issues/Recon_Template_ProviderB-Main_batch-issues.xlsx'],
  },
  'batch-blocked': {
    account: 'ProviderB-Main',
    files: ['batch-blocked/Recon_Template_ProviderB-Main_batch-blocked.xlsx'],
  },
  'legacy-provider': { account: 'ProviderC-Alt', files: ['legacy-provider/Legacy_ProviderC-Alt_batch.xlsx'] },
}

export function expectedOf(sample: SampleName): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(SAMPLES_DIR, sample, 'expected.json'), 'utf8'))
}

export interface Part {
  name: string
  bytes: Uint8Array
}

export type User = 'analyst' | 'viewer'
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type Ctx = Awaited<ReturnType<typeof createTestApp>>

export function samplePart(relative: string): Part {
  return { name: path.basename(relative), bytes: readFileSync(path.join(SAMPLES_DIR, relative)) }
}

/** The proposal as the detail returned it, turned into a confirmation body. */
export function confirmProposal(detail: ImportDetail): MappingConfirmation {
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

export class ImportFlow {
  readonly accountIds: Record<string, string> = {}
  readonly tokens: Record<User, string> = { analyst: '', viewer: '' }
  readonly userIds: Record<User, number> = { analyst: 0, viewer: 0 }
  readonly createdImportIds = new Set<string>()

  constructor(readonly ctx: Ctx) {}

  async init(): Promise<void> {
    const { app, prisma } = this.ctx
    for (const a of await prisma.account.findMany({ select: { accountId: true, name: true } }))
      this.accountIds[a.name] = a.accountId
    for (const userName of ['analyst', 'viewer'] as const) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { userName, password: SEED_PASSWORD },
      })
      expect(res.statusCode).toBe(200)
      this.tokens[userName] = res.json().accessToken
      this.userIds[userName] = (await prisma.user.findUniqueOrThrow({ where: { userName } })).userId
    }
  }

  call(method: Method, url: string, body?: object, user: User = 'analyst') {
    return this.ctx.app.inject({
      method,
      url: `/api/v1${url}`,
      headers: { authorization: `Bearer ${this.tokens[user]}` },
      ...(body === undefined ? {} : { payload: body }),
    })
  }

  async upload(accountId: string, parts: Part[]): Promise<ImportDetail> {
    const form = new FormData()
    for (const part of parts) form.append('files', new Blob([new Uint8Array(part.bytes)]), part.name)
    const response = new Response(form)
    const res = await this.ctx.app.inject({
      method: 'POST',
      url: `/api/v1/accounts/${accountId}/imports`,
      headers: {
        authorization: `Bearer ${this.tokens.analyst}`,
        'content-type': response.headers.get('content-type') as string,
      },
      payload: Buffer.from(await response.arrayBuffer()),
    })
    expect(res.statusCode, res.body).toBe(201)
    const detail = ImportDetail.parse(res.json())
    this.createdImportIds.add(detail.importId)
    return detail
  }

  /** Upload, confirm the proposal and analyze: the import ends `analyzed`. */
  async analyzed(accountId: string, parts: Part[]): Promise<ImportDetail> {
    const detail = await this.upload(accountId, parts)
    const mapping = await this.call('PUT', `/imports/${detail.importId}/mapping`, confirmProposal(detail))
    expect(mapping.statusCode, mapping.body).toBe(200)
    const res = await this.call('POST', `/imports/${detail.importId}/analyze`)
    expect(res.statusCode, res.body).toBe(200)
    return ImportDetail.parse(res.json())
  }

  analyzedSample(sample: SampleName): Promise<ImportDetail> {
    const { account, files } = SAMPLE_FILES[sample]
    return this.analyzed(this.accountIds[account] as string, files.map(samplePart))
  }

  /** Run the validations and review the run: the import ends `validated`. Returns the reviewed runId. */
  async validateAndReview(importId: string): Promise<number> {
    const run = await this.call('POST', `/imports/${importId}/validations`)
    expect(run.statusCode, run.body).toBe(201)
    const runId = run.json().run.runId as number
    const review = await this.call('POST', `/imports/${importId}/review`, { runId })
    expect(review.statusCode, review.body).toBe(200)
    return runId
  }

  /** A sample uploaded, analyzed, validated and reviewed. */
  async validatedSample(sample: SampleName): Promise<{ importId: string; runId: number }> {
    const detail = await this.analyzedSample(sample)
    return { importId: detail.importId, runId: await this.validateAndReview(detail.importId) }
  }

  /** Removes the imports with their runs, findings, occurrences, audit entries, rows, sheets and files. Idempotent. */
  async removeImports(importIds: string[]): Promise<void> {
    if (importIds.length === 0) return
    await removeImportsFrom(this.ctx.prisma, importIds)
    for (const id of importIds) this.createdImportIds.delete(id)
  }

  async close(): Promise<void> {
    await this.removeImports([...this.createdImportIds])
  }
}

/** The cleanup of `ImportFlow.removeImports`, usable without a flow (fixtures created straight in the database). */
export async function removeImportsFrom(prisma: Ctx['prisma'], importIds: string[]): Promise<void> {
  if (importIds.length === 0) return
  // Subqueries, not id lists: a large run has tens of thousands of findings, over the 2 100-parameter limit.
  const runs = Prisma.sql`SELECT [runId] FROM [ValidationRun] WHERE [importId] IN (${Prisma.join(importIds)})`
  const issues = Prisma.sql`SELECT i.[issueId] FROM [ValidationIssue] i
    JOIN [ValidationResult] r ON r.[resultId] = i.[resultId] WHERE r.[runId] IN (${runs})`
  await prisma.$executeRaw`DELETE FROM [AuditLog] WHERE [entityType] = 'ConflictOccurrence' AND [entityId] IN (
    SELECT CONVERT(VARCHAR(64), o.[occurrenceId]) FROM [ConflictOccurrence] o WHERE o.[issueId] IN (${issues}))`
  await prisma.$executeRaw`DELETE FROM [AuditLog] WHERE [entityType] = 'ValidationIssue' AND [entityId] IN (
    SELECT CONVERT(VARCHAR(64), x.[issueId]) FROM (${issues}) x)`
  await prisma.$executeRaw`DELETE FROM [ConflictOccurrence] WHERE [issueId] IN (${issues})`
  await prisma.$executeRaw`DELETE FROM [ValidationIssue] WHERE [issueId] IN (${issues})`
  await prisma.$executeRaw`DELETE FROM [ValidationResult] WHERE [runId] IN (${runs})`
  await prisma.$executeRaw`DELETE FROM [ValidationRun] WHERE [runId] IN (${runs})`
  await prisma.auditLog.deleteMany({ where: { entityType: 'Import', entityId: { in: importIds } } })
  const sheetIds = (
    await prisma.importSheet.findMany({ where: { file: { importId: { in: importIds } } }, select: { sheetId: true } })
  ).map((s) => s.sheetId)
  if (sheetIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { entityType: 'ImportRow', OR: sheetIds.map((id) => ({ entityId: { startsWith: `${id}:` } })) },
    })
  }
  await prisma.importRow.deleteMany({ where: { sheet: { file: { importId: { in: importIds } } } } })
  await prisma.importSheetColumnMap.deleteMany({ where: { sheet: { file: { importId: { in: importIds } } } } })
  await prisma.importSheet.deleteMany({ where: { file: { importId: { in: importIds } } } })
  await prisma.importFile.deleteMany({ where: { importId: { in: importIds } } })
  await prisma.import.deleteMany({ where: { importId: { in: importIds } } })
}
