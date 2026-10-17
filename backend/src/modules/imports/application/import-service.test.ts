import { randomUUID } from 'node:crypto'
import { ImportDetail } from '@recon/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import { InMemoryAuditLogger } from '../../../test-support/in-memory-audit-logger.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { DuplicateFileError, FileUnreadableError, ImportNotEditableError } from '../domain/errors.js'
import { UNPROPOSED_SHEET_KIND } from '../domain/sheet-kind-marker.js'
import {
  ACCOUNT_IDS,
  FakeWorkbookReader,
  InMemoryFileStore,
  InMemoryImportRepository,
  InMemoryMatchingRulesRepository,
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

const ANALYST: Scope = { merchantIds: [1, 2] }
const VIEWER: Scope = { merchantIds: [1] }
const ANALYST_ID = 2
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
const A_USD = ACCOUNT_IDS['ProviderA-USD']
const C_ALT = ACCOUNT_IDS['ProviderC-Alt']
const C_USD = ACCOUNT_IDS['ProviderC-USD']

let imports: InMemoryImportRepository
let files: InMemoryFileStore
let service: ImportService
const log = { error: vi.fn(), warn: vi.fn() }

/** The analysis ports (import-analyze); exercised in import-service.analysis.test.ts. */
function analysisDeps(imports: InMemoryImportRepository) {
  const transactions = new InMemoryTransactionLookup([])
  return {
    rows: new InMemoryImportRowRepository(imports, transactions),
    transactions,
    accounts: new InMemoryAccountContext(),
    feeTypes: new InMemoryFeeTypeCatalog(),
    audit: new InMemoryAuditLogger(),
    limits: { maxRowsPerImport: 100_000 },
  }
}

beforeEach(() => {
  imports = new InMemoryImportRepository()
  files = new InMemoryFileStore()
  service = new ImportService({
    imports,
    files,
    reader: new FakeWorkbookReader(),
    rules: new InMemoryMatchingRulesRepository(),
    ids: sequentialIds(),
    log,
    ...analysisDeps(imports),
  })
  log.error.mockClear()
  log.warn.mockClear()
})

async function upload(sample: SampleFile, fileName = sample.fileName): Promise<StagedUpload> {
  return { fileName, ...(await files.stageBytes(sample.bytes)) }
}

async function caught<E>(promise: Promise<unknown>, type: new (...args: never[]) => E): Promise<E> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(type)
  return error as E
}

/** Same fakes as `service`, but the rules fail on their second load: the one that builds the detail, after persisting. */
function serviceFailingAfterPersist(): ImportService {
  const rules = new InMemoryMatchingRulesRepository()
  let calls = 0
  return new ImportService({
    imports,
    files,
    reader: new FakeWorkbookReader(),
    ids: randomUUID,
    log,
    rules: {
      rulesFor: async (ruleSetId) => {
        if (++calls === 2) throw new Error('rules unavailable')
        return rules.rulesFor(ruleSetId)
      },
    },
    ...analysisDeps(imports),
  })
}

const sheetNamed = (detail: ImportDetail, name: string, fileIndex = 0) => {
  const found = detail.files[fileIndex]?.sheets.find((s) => s.sheetName === name)
  if (!found) throw new Error(`sheet ${name} missing`)
  return found
}

describe('createImport', () => {
  it('creates an uploaded import with the file, its sheets, the proposal and the readiness (batch-clean)', async () => {
    const staged = await upload(SAMPLE_FILES.batchClean)

    const detail = await service.createImport(ANALYST, ANALYST_ID, A_USD, [staged])

    expect(ImportDetail.safeParse(detail).success).toBe(true)
    expect(detail).toMatchObject({
      accountId: A_USD,
      status: 'uploaded',
      createdBy: { userId: 2, userName: 'analyst' },
      analyzedAt: null,
      rowsTotal: null,
      currentBatchId: null,
      fileCount: 1,
    })
    const file = detail.files[0]
    expect(file).toMatchObject({
      fileName: SAMPLE_FILES.batchClean.fileName,
      sizeBytes: SAMPLE_FILES.batchClean.bytes.length,
      sha256: staged.sha256,
    })
    expect(file?.sheets.map((s) => [s.sheetName, s.rowCount])).toEqual([
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
    const app = sheetNamed(detail, 'APP')
    expect(app.proposed).toEqual({
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
      statusName: 'Successful',
      source: 'global',
    })
    expect(app.columns).toEqual([
      { sourceColumn: 'ID', targetField: 'transactionId', source: 'global' },
      { sourceColumn: 'Amount', targetField: 'amount', source: 'global' },
      { sourceColumn: 'Currency', targetField: 'currency', source: 'global' },
    ])
    expect(app.preview).toEqual([{ ID: '252570479111759', Amount: '16.22', Currency: 'USD' }])
    expect(sheetNamed(detail, 'Settings')).toMatchObject({
      hidden: true,
      proposed: { kind: 'ignore', source: 'global' },
    })
    expect(sheetNamed(detail, 'RR').proposed).toMatchObject({ kind: 'transactions', cycle: 'R', statusId: null })
    expect(detail.readiness.canAnalyze).toBe(true)
    expect(detail.readiness.missing).toEqual([])
    // DEC with rows opens the DEC range; three ignored sheets; Settings is both hidden and ignored.
    expect(detail.readiness.notes.map((n) => n.sheetName)).toEqual([
      'DEC',
      'Duplicate Corrections',
      'CHB Alerts',
      'Settings',
      'Settings',
    ])
  })

  it('stores the file under imports/<importId>/<fileId>.xlsx, never under the client name, and leaves no temp file', async () => {
    const detail = await service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.batchClean)])

    const fileId = detail.files[0]?.fileId
    expect(files.paths()).toEqual([`imports/${detail.importId}/${fileId}.xlsx`])
    const record = await imports.findImport(ANALYST, detail.importId)
    expect(record?.files[0]?.storagePath).toBe(`imports/${detail.importId}/${fileId}.xlsx`)
    expect(record?.files[0]?.storagePath).not.toContain('Recon_Template')
  })

  it('persists the sheet proposal as a snapshot with mappingConfirmed = false', async () => {
    const detail = await service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.batchClean)])

    const record = await imports.findImport(ANALYST, detail.importId)
    expect(record?.sheets).toHaveLength(10)
    expect(record?.sheets.find((s) => s.sheetName === 'CHB')).toMatchObject({
      kind: 'transactions',
      cycle: 'I',
      statusId: 4,
      rowCount: 3,
      mappingConfirmed: false,
    })
    expect(record?.sheets.find((s) => s.sheetName === 'Other Fees')).toMatchObject({
      kind: 'batch_fees',
      cycle: null,
      statusId: null,
    })
    expect(record?.sheets.map((s) => s.sheetId)).toEqual(detail.files[0]?.sheets.map((s) => s.sheetId))
  })

  it('persists a sheet without proposal with the ignore marker and reports it as kind null', async () => {
    const detail = await service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.unruled)])

    const bonus = sheetNamed(detail, 'Bonus')
    expect(bonus.proposed).toEqual({ kind: null, cycle: null, statusId: null, statusName: null, source: 'none' })
    expect(bonus.columns.every((c) => c.targetField === null && c.source === 'none')).toBe(true)
    const record = await imports.findImport(ANALYST, detail.importId)
    expect(record?.sheets.find((s) => s.sheetName === 'Bonus')).toMatchObject({
      kind: UNPROPOSED_SHEET_KIND,
      mappingConfirmed: false,
    })
    expect(detail.readiness.canAnalyze).toBe(false)
    expect(detail.readiness.missing).toEqual([
      { sheetId: bonus.sheetId, sheetName: 'Bonus', field: 'kind', message: expect.stringContaining('Bonus') },
    ])
  })

  it('groups two files in one import and proposes over both (batch-split)', async () => {
    const detail = await service.createImport(ANALYST, ANALYST_ID, A_USD, [
      await upload(SAMPLE_FILES.part1),
      await upload(SAMPLE_FILES.part2),
    ])

    expect(detail.fileCount).toBe(2)
    expect(detail.files.map((f) => f.fileName)).toEqual([SAMPLE_FILES.part1.fileName, SAMPLE_FILES.part2.fileName])
    expect(sheetNamed(detail, 'APP', 0).rowCount).toBe(340)
    expect(sheetNamed(detail, 'CHB', 1)).toMatchObject({
      rowCount: 3,
      proposed: { cycle: 'I', statusId: 4, source: 'global' },
    })
    expect(detail.readiness.canAnalyze).toBe(true)
  })

  it('applies the account rule set and the aliases (legacy-provider on ProviderC-Alt)', async () => {
    const detail = await service.createImport(ANALYST, ANALYST_ID, C_ALT, [await upload(SAMPLE_FILES.legacy)])

    expect(sheetNamed(detail, 'TRX').proposed).toMatchObject({
      kind: 'transactions',
      cycle: 'E',
      statusId: null,
      source: 'account',
    })
    expect(sheetNamed(detail, 'Summary').proposed).toMatchObject({ kind: 'ignore', source: 'account' })
    expect(sheetNamed(detail, 'CB').columns[1]).toEqual({
      sourceColumn: 'Order Status',
      targetField: 'status',
      source: 'account',
      statusValues: [{ value: 'CHB 2', statusId: 4, statusName: 'Chargeback', excludeAmount: true }],
    })
    expect(detail.readiness.canAnalyze).toBe(true)
  })

  it('rejects the same bytes twice in one request, writing nothing', async () => {
    const first = await upload(SAMPLE_FILES.part1)
    const second = await upload(SAMPLE_FILES.part1, 'renamed-part1.xlsx')

    const error = await caught(service.createImport(ANALYST, ANALYST_ID, A_USD, [first, second]), DuplicateFileError)

    expect(error.details).toEqual({ fileId: null, fileName: SAMPLE_FILES.part1.fileName })
    expect(files.paths()).toEqual([])
    expect(await imports.listImports(ANALYST, A_USD)).toEqual([])
  })

  it('rejects content that is not an OOXML package, discarding the staged file', async () => {
    const staged = {
      fileName: 'batch.xlsx',
      ...(await files.stageBytes(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2, 3, 4]))),
    }

    const error = await caught(service.createImport(ANALYST, ANALYST_ID, A_USD, [staged]), FileUnreadableError)

    expect(error.details).toEqual({ fileName: 'batch.xlsx' })
    expect(files.paths()).toEqual([])
  })

  it('answers not found for an account outside the scope, with the same message as an unknown account, discarding the files', async () => {
    const outside = await caught(
      service.createImport(VIEWER, 3, C_USD, [await upload(SAMPLE_FILES.batchClean)]),
      NotFoundError,
    )
    const unknown = await caught(
      service.createImport(VIEWER, 3, UNKNOWN_UUID, [await upload(SAMPLE_FILES.batchClean)]),
      NotFoundError,
    )

    expect(outside.message).toBe(unknown.message)
    expect(files.paths()).toEqual([])
  })

  it('removes the moved files when the repository fails after the commit, and rethrows', async () => {
    imports.failNextWrite()

    await expect(
      service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.batchClean)]),
    ).rejects.toThrow('simulated database failure')

    expect(files.paths()).toEqual([])
    expect(await imports.listImports(ANALYST, A_USD)).toEqual([])
  })

  it('discards the staged files and removes the ones already moved when a commit fails', async () => {
    files.failNextCommit()

    await expect(
      service.createImport(ANALYST, ANALYST_ID, A_USD, [
        await upload(SAMPLE_FILES.part1),
        await upload(SAMPLE_FILES.part2),
      ]),
    ).rejects.toThrow('simulated disk failure')

    expect(files.paths()).toEqual([])
    expect(await imports.listImports(ANALYST, A_USD)).toEqual([])
  })

  it('keeps the persisted import and its file when something fails after the rows are written', async () => {
    await expect(
      serviceFailingAfterPersist().createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.batchClean)]),
    ).rejects.toThrow('rules unavailable')

    const [stored] = await imports.listImports(ANALYST, A_USD)
    expect(stored?.fileCount).toBe(1)
    const record = await imports.findImport(ANALYST, stored?.importId ?? '')
    expect(files.paths()).toEqual([record?.files[0]?.storagePath])
  })
})

describe('addFiles and removeFile', () => {
  let importId: string
  let part1FileId: string

  beforeEach(async () => {
    const detail = await service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.part1)])
    importId = detail.importId
    part1FileId = detail.files[0]?.fileId as string
  })

  it('adds the second part and recalculates the proposal, keeping the first file untouched', async () => {
    const detail = await service.addFiles(ANALYST, importId, [await upload(SAMPLE_FILES.part2)])

    expect(detail.fileCount).toBe(2)
    expect(detail.files[0]?.fileId).toBe(part1FileId)
    expect(sheetNamed(detail, 'RR', 1).rowCount).toBe(320)
    expect(files.paths()).toHaveLength(2)
    expect(detail.readiness.canAnalyze).toBe(true)
  })

  it('rejects a file already in the import by hash, naming it, and leaves the import unchanged', async () => {
    await service.addFiles(ANALYST, importId, [await upload(SAMPLE_FILES.part2)])

    const error = await caught(
      service.addFiles(ANALYST, importId, [await upload(SAMPLE_FILES.part1, 'copy.xlsx')]),
      DuplicateFileError,
    )

    expect(error.details).toEqual({ fileId: part1FileId, fileName: SAMPLE_FILES.part1.fileName })
    const detail = await service.getImport(ANALYST, importId)
    expect(detail.fileCount).toBe(2)
    expect(files.paths().filter((p) => p.startsWith('tmp/'))).toEqual([])
  })

  it('removes a file with its sheets and its bytes', async () => {
    const withBoth = await service.addFiles(ANALYST, importId, [await upload(SAMPLE_FILES.part2)])
    const part2FileId = withBoth.files[1]?.fileId as string

    const detail = await service.removeFile(ANALYST, importId, part2FileId)

    expect(detail.files.map((f) => f.fileId)).toEqual([part1FileId])
    expect(files.paths()).toEqual([`imports/${importId}/${part1FileId}.xlsx`])
    expect((await imports.findImport(ANALYST, importId))?.sheets.every((s) => s.fileId === part1FileId)).toBe(true)
  })

  it('allows removing the last file: the import stays uploaded and cannot be analyzed', async () => {
    const detail = await service.removeFile(ANALYST, importId, part1FileId)

    expect(detail.files).toEqual([])
    expect(detail.status).toBe('uploaded')
    expect(detail.readiness.canAnalyze).toBe(false)
    expect(files.paths()).toEqual([])
  })

  it.each(['analyzed', 'validated', 'processed', 'cancelled'] as const)(
    'refuses to add or remove files on an import in %s',
    async (status) => {
      imports.setStatus(importId, status)

      const add = await caught(
        service.addFiles(ANALYST, importId, [await upload(SAMPLE_FILES.part2)]),
        ImportNotEditableError,
      )
      const remove = await caught(service.removeFile(ANALYST, importId, part1FileId), ImportNotEditableError)

      expect(add.details).toEqual({ status })
      expect(remove.details).toEqual({ status })
      expect((await service.getImport(ANALYST, importId)).fileCount).toBe(1)
      expect(files.paths().filter((p) => p.startsWith('tmp/'))).toEqual([])
    },
  )

  it('answers not found for an unknown file of the import', async () => {
    const error = await caught(service.removeFile(ANALYST, importId, UNKNOWN_UUID), NotFoundError)

    expect(error.message).toBe('File not found')
  })

  it('keeps the added file when something fails after its rows are written', async () => {
    await expect(
      serviceFailingAfterPersist().addFiles(ANALYST, importId, [await upload(SAMPLE_FILES.part2)]),
    ).rejects.toThrow('rules unavailable')

    const record = await imports.findImport(ANALYST, importId)
    expect(record?.files).toHaveLength(2)
    expect(files.paths().sort()).toEqual(record?.files.map((f) => f.storagePath).sort())
  })
})

describe('getImport and listImports', () => {
  it('returns exactly the body the upload returned', async () => {
    const created = await service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.batchClean)])

    const fetched = await service.getImport(ANALYST, created.importId)

    expect(fetched).toEqual(created)
  })

  it('answers not found for an import outside the scope, same as for an unknown one', async () => {
    const created = await service.createImport(ANALYST, ANALYST_ID, C_ALT, [await upload(SAMPLE_FILES.legacy)])

    const outside = await caught(service.getImport(VIEWER, created.importId), NotFoundError)
    const unknown = await caught(service.getImport(VIEWER, UNKNOWN_UUID), NotFoundError)

    expect(outside.message).toBe(unknown.message)
  })

  it('lists the imports of an account newest first, with the file count and without sheets', async () => {
    const first = await service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.part1)])
    const second = await service.createImport(ANALYST, ANALYST_ID, A_USD, [
      await upload(SAMPLE_FILES.part1),
      await upload(SAMPLE_FILES.part2),
    ])
    await service.createImport(ANALYST, ANALYST_ID, C_ALT, [await upload(SAMPLE_FILES.legacy)])

    const list = await service.listImports(ANALYST, A_USD)

    expect(list.map((i) => [i.importId, i.fileCount])).toEqual([
      [second.importId, 2],
      [first.importId, 1],
    ])
    expect(list[0]).not.toHaveProperty('files')
  })

  it('filters by status', async () => {
    const first = await service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.part1)])
    const second = await service.createImport(ANALYST, ANALYST_ID, A_USD, [await upload(SAMPLE_FILES.part2)])
    imports.setStatus(first.importId, 'analyzed')

    expect((await service.listImports(ANALYST, A_USD, 'uploaded')).map((i) => i.importId)).toEqual([second.importId])
    expect(await service.listImports(ANALYST, A_USD, 'processed')).toEqual([])
  })

  it('answers not found when listing an account outside the scope', async () => {
    const outside = await caught(service.listImports(VIEWER, C_USD), NotFoundError)
    const unknown = await caught(service.listImports(VIEWER, UNKNOWN_UUID), NotFoundError)

    expect(outside.message).toBe(unknown.message)
  })
})
