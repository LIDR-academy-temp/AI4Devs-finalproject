// Prisma adapter of ImportRepository (design D12). The scope travels inside every read (catalog design D2);
// writes are transactional; the UNIQUE (importId, sha256) constraint surfaces as DuplicateFileError.
import { Cycle, ImportStatus, SheetKind, TargetField } from '@recon/shared'
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type {
  AccountRef,
  ConfirmedSheet,
  ImportRecord,
  ImportRepository,
  ImportSummaryRecord,
  NewImport,
  NewImportFile,
} from '../application/ports.js'
import { DuplicateFileError, ImportNotCancellableError, ImportNotEditableError } from '../domain/errors.js'
import { CANCELLABLE_STATUSES, EDITABLE_STATUSES } from '../domain/import-state.js'

const UNIQUE_VIOLATION = 'P2002'

type Tx = Prisma.TransactionClient

function visibleAccount(scope: Scope): Prisma.AccountWhereInput {
  return { provider: { merchantId: { in: [...scope.merchantIds] } } }
}

const summarySelect = {
  importId: true,
  accountId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  analyzedAt: true,
  rowsTotal: true,
  rowsMatched: true,
  rowsUnmatched: true,
  currentBatchId: true,
  createdBy: { select: { userId: true, userName: true } },
  account: { select: { matchingRuleSetId: true } },
} satisfies Prisma.ImportSelect

const sheetSelect = {
  sheetId: true,
  sheetName: true,
  kind: true,
  cycle: true,
  statusId: true,
  rowCount: true,
  mappingConfirmed: true,
  sheetIndex: true,
  columnMaps: { select: { sourceColumn: true, targetField: true } },
} satisfies Prisma.ImportSheetSelect

const fileSelect = {
  fileId: true,
  fileName: true,
  storagePath: true,
  sizeBytes: true,
  sha256: true,
  uploadedAt: true,
  sheets: { select: sheetSelect },
} satisfies Prisma.ImportFileSelect

type SummaryRow = Prisma.ImportGetPayload<{ select: typeof summarySelect }>

function toSummary(row: SummaryRow, fileCount: number): ImportSummaryRecord {
  const { account, ...rest } = row
  return {
    ...rest,
    // The CHECK constraint guarantees the value; an unexpected one is a data error, not a 200.
    status: ImportStatus.parse(row.status),
    matchingRuleSetId: account.matchingRuleSetId,
    fileCount,
  }
}

function fileCreate(file: NewImportFile): Prisma.ImportFileCreateWithoutImportInput {
  return {
    fileId: file.fileId,
    fileName: file.fileName,
    storagePath: file.storagePath,
    sizeBytes: file.sizeBytes,
    sha256: file.sha256,
    sheets: {
      create: file.sheets.map((s) => ({
        sheetId: s.sheetId,
        sheetName: s.sheetName,
        kind: s.kind,
        cycle: s.cycle,
        statusId: s.statusId,
        rowCount: s.rowCount,
        sheetIndex: s.sheetIndex,
      })),
    },
  }
}

export class PrismaImportRepository implements ImportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAccount(scope: Scope, accountId: string): Promise<AccountRef | null> {
    return this.prisma.account.findFirst({
      where: { accountId, ...visibleAccount(scope) },
      select: { accountId: true, matchingRuleSetId: true },
    })
  }

  async findImport(scope: Scope, importId: string): Promise<ImportRecord | null> {
    const row = await this.prisma.import.findFirst({
      where: { importId, account: visibleAccount(scope) },
      select: {
        ...summarySelect,
        files: { select: fileSelect, orderBy: [{ uploadedAt: 'asc' }, { fileName: 'asc' }] },
      },
    })
    if (!row) return null
    const { files, ...summary } = row
    return {
      ...toSummary(summary, files.length),
      files: files.map(({ sheets: _, ...file }) => file),
      sheets: files.flatMap((file) =>
        file.sheets.map((s) => ({
          ...s,
          fileId: file.fileId,
          kind: SheetKind.parse(s.kind),
          cycle: s.cycle === null ? null : Cycle.parse(s.cycle),
          columnMaps: s.columnMaps.map((c) => ({
            sourceColumn: c.sourceColumn,
            targetField: TargetField.parse(c.targetField),
          })),
        })),
      ),
    }
  }

  /**
   * The guard of every edit (spec: import, D2), first statement of its transaction: the UPDATE holds an exclusive
   * lock on the Import row until commit, so a concurrent analysis, cancel or edit waits and then finds it changed.
   */
  private async claimEditable(tx: Tx, importId: string, expectedUpdatedAt: Date, data: Prisma.ImportUpdateInput) {
    const claimed = await tx.import.updateMany({
      where: { importId, status: { in: [...EDITABLE_STATUSES] }, updatedAt: expectedUpdatedAt },
      data: { ...data, updatedAt: new Date() },
    })
    if (claimed.count === 1) return
    const current = await tx.import.findUnique({ where: { importId }, select: { status: true } })
    const status = current?.status ?? 'unknown'
    throw new ImportNotEditableError(status, EDITABLE_STATUSES.has(status as ImportStatus))
  }

  /** The confirmed mapping replaces the previous one sheet by sheet; the import moves to `mapped` in the same transaction. */
  async confirmMapping(importId: string, expectedUpdatedAt: Date, sheets: ConfirmedSheet[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.claimEditable(tx, importId, expectedUpdatedAt, { status: 'mapped' })
      for (const sheet of sheets) {
        await tx.importSheet.update({
          where: { sheetId: sheet.sheetId },
          data: { kind: sheet.kind, cycle: sheet.cycle, statusId: sheet.statusId, mappingConfirmed: true },
        })
        await tx.importSheetColumnMap.deleteMany({ where: { sheetId: sheet.sheetId } })
        if (sheet.columns.length > 0) {
          await tx.importSheetColumnMap.createMany({
            data: sheet.columns.map((c) => ({
              sheetId: sheet.sheetId,
              sourceColumn: c.sourceColumn,
              targetField: c.targetField,
            })),
          })
        }
      }
    })
  }

  /**
   * Only from a cancellable status, in one statement: the UPDATE guards the status and OUTPUT returns the one it
   * replaced, under the same lock. A cancel that lost the race to another one, or to processing, writes nothing.
   */
  async cancel(importId: string): Promise<ImportStatus> {
    // updatedAt is the optimistic version of the import: written as datetime2(7) explicitly, never left to how the
    // parameter is typed (see the run guard in prisma-validation-run-repository.ts).
    const previous = await this.prisma.$queryRaw<{ status: string }[]>`
      UPDATE [Import] SET [status] = 'cancelled', [updatedAt] = CAST(${new Date().toISOString()} AS datetime2(7))
      OUTPUT deleted.[status] AS status
      WHERE [importId] = ${importId} AND [status] IN (${Prisma.join([...CANCELLABLE_STATUSES])})`
    const replaced = previous[0]
    if (replaced) return ImportStatus.parse(replaced.status)
    const current = await this.prisma.import.findUnique({ where: { importId }, select: { status: true } })
    throw new ImportNotCancellableError(current?.status ?? 'unknown')
  }

  async currentRunId(importId: string): Promise<number | null> {
    const run = await this.prisma.validationRun.findFirst({
      where: { importId, isSuperseded: false },
      select: { runId: true },
    })
    return run?.runId ?? null
  }

  async listImports(scope: Scope, accountId: string, status?: ImportStatus): Promise<ImportSummaryRecord[]> {
    const rows = await this.prisma.import.findMany({
      where: { accountId, account: visibleAccount(scope), ...(status ? { status } : {}) },
      select: { ...summarySelect, _count: { select: { files: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(({ _count, ...row }) => toSummary(row, _count.files))
  }

  async createImport(data: NewImport): Promise<void> {
    try {
      await this.prisma.import.create({
        data: {
          importId: data.importId,
          accountId: data.accountId,
          createdByUserId: data.createdByUserId,
          status: 'uploaded',
          files: { create: data.files.map(fileCreate) },
        },
      })
    } catch (error) {
      throw await this.translate(error, data.importId, data.files)
    }
  }

  async addFiles(importId: string, expectedUpdatedAt: Date, files: NewImportFile[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.claimEditable(tx, importId, expectedUpdatedAt, {})
        for (const file of files) await tx.importFile.create({ data: { ...fileCreate(file), importId } })
      })
    } catch (error) {
      throw await this.translate(error, importId, files)
    }
  }

  async removeFile(importId: string, expectedUpdatedAt: Date, fileId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.claimEditable(tx, importId, expectedUpdatedAt, {})
      await tx.importRow.deleteMany({ where: { sheet: { fileId } } })
      await tx.importSheetColumnMap.deleteMany({ where: { sheet: { fileId } } })
      await tx.importSheet.deleteMany({ where: { fileId } })
      await tx.importFile.deleteMany({ where: { fileId, importId } })
    })
  }

  /** A race on the unique (importId, sha256) index is answered like the pre-check: 409 naming the stored file. */
  private async translate(error: unknown, importId: string, files: NewImportFile[]): Promise<unknown> {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== UNIQUE_VIOLATION) return error
    const existing = await this.prisma.importFile.findFirst({
      where: { importId, sha256: { in: files.map((f) => f.sha256) } },
      select: { fileId: true, fileName: true },
    })
    return new DuplicateFileError(existing?.fileName ?? files[0]?.fileName ?? 'file', existing?.fileId ?? null)
  }
}
