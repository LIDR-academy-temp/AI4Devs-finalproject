// Use cases of the import module (README §4.2, §4.4 rows Importación; HU1 CA 1–3). Design D6 (files and
// database never inconsistent the dangerous way) and D8 (one way to build the detail: re-read the files,
// apply the rules in force, match sheets to their persisted ids).
import type { ImportDetail, ImportFileDetail, ImportSheetDetail, ImportStatus, ImportSummary } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { MatchingRulesRepository } from '../../matching/application/ports.js'
import { type MappingProposal, proposeMapping } from '../../matching/domain/propose-mapping.js'
import type { MatchingRules } from '../../matching/domain/rules.js'
import { DuplicateFileError, FileUnreadableError, ImportNotEditableError } from '../domain/errors.js'
import { assessReadiness, type ReadinessSheet } from '../domain/readiness.js'
import { UNPROPOSED_SHEET_KIND } from '../domain/sheet-kind-marker.js'
import { isOoxmlMagic } from '../domain/upload-policy.js'
import type { WorkbookDescription } from '../domain/workbook.js'
import type {
  AccountRef,
  FileStore,
  IdGenerator,
  ImportFileRecord,
  ImportRecord,
  ImportRepository,
  ImportSummaryRecord,
  NewImportFile,
  Scope,
  StagedUpload,
  WorkbookReader,
} from './ports.js'

export interface ImportServiceLog {
  error(obj: object, msg: string): void
  warn(obj: object, msg: string): void
}

export interface ImportServiceDeps {
  imports: ImportRepository
  files: FileStore
  reader: WorkbookReader
  rules: MatchingRulesRepository
  ids: IdGenerator
  log: ImportServiceLog
}

/** Files can be added or removed only before the analysis (HU1 CA2). */
const EDITABLE_STATUSES: ReadonlySet<ImportStatus> = new Set(['uploaded', 'mapped'])

interface ReadUpload {
  upload: StagedUpload
  workbook: WorkbookDescription
}

interface PlannedFile extends NewImportFile {
  tempPath: string
}

export class ImportService {
  constructor(private readonly deps: ImportServiceDeps) {}

  async createImport(scope: Scope, userId: number, accountId: string, uploads: StagedUpload[]): Promise<ImportDetail> {
    const importId = await this.withStaged(uploads, async (committed) => {
      const account = await this.requireAccount(scope, accountId)
      this.rejectDuplicates(uploads, [])
      const read = await this.readAll(uploads)
      const rules = await this.deps.rules.rulesFor(account.matchingRuleSetId)
      const newImportId = this.deps.ids()
      const files = this.plan(newImportId, read, rules)
      await this.commitThenPersist(files, committed, () =>
        this.deps.imports.createImport({ importId: newImportId, accountId, createdByUserId: userId, files }),
      )
      return newImportId
    })
    // From here on the import exists in the database: a failure surfaces as an error, it never removes
    // files whose rows are already written (design D6: a row without its file is the dangerous state).
    return this.detailOf(scope, importId)
  }

  async addFiles(scope: Scope, importId: string, uploads: StagedUpload[]): Promise<ImportDetail> {
    await this.withStaged(uploads, async (committed) => {
      const record = await this.requireEditable(scope, importId)
      this.rejectDuplicates(uploads, record.files)
      const read = await this.readAll(uploads)
      const rules = await this.deps.rules.rulesFor(record.matchingRuleSetId)
      const files = this.plan(importId, read, rules)
      await this.commitThenPersist(files, committed, () => this.deps.imports.addFiles(importId, files))
    })
    // Same as createImport: the rows are written, so the detail is built outside the cleanup scope.
    return this.detailOf(scope, importId)
  }

  async removeFile(scope: Scope, importId: string, fileId: string): Promise<ImportDetail> {
    const record = await this.requireEditable(scope, importId)
    const file = record.files.find((f) => f.fileId === fileId)
    if (!file) throw new NotFoundError('File')
    // Database first, then disk: an orphan file is harmless, a row without its file is not (design D6).
    await this.deps.imports.removeFile(importId, fileId)
    try {
      await this.deps.files.remove(file.storagePath)
    } catch (err) {
      this.deps.log.warn(
        { err, importId, fileId, storagePath: file.storagePath },
        'file removed from the import but not from disk',
      )
    }
    return this.detailOf(scope, importId)
  }

  async getImport(scope: Scope, importId: string): Promise<ImportDetail> {
    return this.detailOf(scope, importId)
  }

  async listImports(scope: Scope, accountId: string, status?: ImportStatus): Promise<ImportSummary[]> {
    await this.requireAccount(scope, accountId)
    const records = await this.deps.imports.listImports(scope, accountId, status)
    return records.map(toSummary)
  }

  // ───────────────────────── steps ─────────────────────────

  private async requireAccount(scope: Scope, accountId: string): Promise<AccountRef> {
    const account = await this.deps.imports.findAccount(scope, accountId)
    if (!account) throw new NotFoundError('Account')
    return account
  }

  private async requireImport(scope: Scope, importId: string): Promise<ImportRecord> {
    const record = await this.deps.imports.findImport(scope, importId)
    if (!record) throw new NotFoundError('Import')
    return record
  }

  private async requireEditable(scope: Scope, importId: string): Promise<ImportRecord> {
    const record = await this.requireImport(scope, importId)
    if (!EDITABLE_STATUSES.has(record.status)) throw new ImportNotEditableError(record.status)
    return record
  }

  /** Same bytes twice in the request, or already in the import (design D5): the whole request is rejected. */
  private rejectDuplicates(uploads: StagedUpload[], existing: ImportFileRecord[]): void {
    const seen = new Map<string, StagedUpload>()
    for (const upload of uploads) {
      const stored = existing.find((f) => f.sha256 === upload.sha256)
      if (stored) throw new DuplicateFileError(stored.fileName, stored.fileId)
      const earlier = seen.get(upload.sha256)
      if (earlier) throw new DuplicateFileError(earlier.fileName, null)
      seen.set(upload.sha256, upload)
    }
  }

  private async readAll(uploads: StagedUpload[]): Promise<ReadUpload[]> {
    const read: ReadUpload[] = []
    for (const upload of uploads) {
      const bytes = await this.deps.files.read(upload.tempPath)
      if (!isOoxmlMagic(bytes)) throw new FileUnreadableError(upload.fileName, 'not a zip package')
      read.push({ upload, workbook: this.deps.reader.describe(bytes, upload.fileName) })
    }
    return read
  }

  /** Ids, storage paths and the sheet snapshot (design D4, D7) for the files about to be persisted. */
  private plan(importId: string, read: ReadUpload[], rules: MatchingRules): PlannedFile[] {
    return read.map(({ upload, workbook }) => {
      const fileId = this.deps.ids()
      const proposal = proposeMapping(workbook, rules)
      return {
        fileId,
        fileName: upload.fileName,
        storagePath: storagePathOf(importId, fileId),
        sizeBytes: upload.sizeBytes,
        sha256: upload.sha256,
        tempPath: upload.tempPath,
        sheets: workbook.sheets.map((sheet, index) => {
          const proposed = proposal.sheets[index]?.proposed
          return {
            sheetId: this.deps.ids(),
            sheetName: sheet.name,
            kind: proposed?.kind ?? UNPROPOSED_SHEET_KIND,
            cycle: proposed?.cycle ?? null,
            statusId: proposed?.statusId ?? null,
            rowCount: sheet.rowCount,
          }
        }),
      }
    })
  }

  /** Design D6 steps 3–4: move the files to their final paths, then write the rows. */
  private async commitThenPersist(
    files: PlannedFile[],
    committed: Map<string, string>,
    persist: () => Promise<void>,
  ): Promise<void> {
    for (const file of files) {
      await this.deps.files.commit(file.tempPath, file.storagePath)
      committed.set(file.tempPath, file.storagePath)
    }
    await persist()
  }

  /**
   * Runs the steps up to and including the database write over staged uploads. On any failure the staged
   * files not yet moved are discarded and the ones already moved are removed, so a rejected request leaves
   * nothing behind (design D6). Nothing that runs after the rows are written belongs inside this scope.
   */
  private async withStaged<T>(
    uploads: StagedUpload[],
    run: (committed: Map<string, string>) => Promise<T>,
  ): Promise<T> {
    const committed = new Map<string, string>()
    try {
      return await run(committed)
    } catch (error) {
      await this.cleanup(uploads, committed)
      throw error
    }
  }

  private async cleanup(uploads: StagedUpload[], committed: Map<string, string>): Promise<void> {
    for (const upload of uploads) {
      const storagePath = committed.get(upload.tempPath)
      try {
        if (storagePath === undefined) await this.deps.files.discard(upload.tempPath)
        else await this.deps.files.remove(storagePath)
      } catch (err) {
        this.deps.log.error(
          { err, path: storagePath ?? upload.tempPath },
          'could not clean up an upload after a failure',
        )
      }
    }
  }

  /** Design D8: the detail is always rebuilt from the stored files and the rules in force. */
  private async detailOf(scope: Scope, importId: string): Promise<ImportDetail> {
    const record = await this.requireImport(scope, importId)
    const rules = await this.deps.rules.rulesFor(record.matchingRuleSetId)
    const files: ImportFileDetail[] = []
    const readiness: ReadinessSheet[] = []
    for (const file of record.files) {
      const bytes = await this.deps.files.read(file.storagePath)
      const workbook = this.deps.reader.describe(bytes, file.fileName)
      const proposal = proposeMapping(workbook, rules)
      const sheets = workbook.sheets.map((sheet, index) => {
        const persisted = record.sheets.find((s) => s.fileId === file.fileId && s.sheetName === sheet.name)
        if (!persisted) throw new Error(`sheet "${sheet.name}" of file ${file.fileId} is not persisted`)
        const proposed = proposalOf(proposal, index)
        readiness.push({
          sheetId: persisted.sheetId,
          sheetName: sheet.name,
          hidden: sheet.hidden,
          rowCount: sheet.rowCount,
          proposed: proposed.proposed,
          columns: proposed.columns,
          columnStats: sheet.columnStats,
        })
        const detail: ImportSheetDetail = {
          sheetId: persisted.sheetId,
          sheetName: sheet.name,
          hidden: sheet.hidden,
          rowCount: sheet.rowCount,
          proposed: proposed.proposed,
          columns: proposed.columns,
          preview: sheet.preview.map((row) => Object.fromEntries(sheet.headers.map((h, i) => [h, row[i] ?? '']))),
        }
        return detail
      })
      files.push({
        fileId: file.fileId,
        fileName: file.fileName,
        sizeBytes: file.sizeBytes,
        sha256: file.sha256,
        uploadedAt: file.uploadedAt.toISOString(),
        sheets,
      })
    }
    return { ...toSummary(record), files, readiness: assessReadiness(readiness, rules.statuses) }
  }
}

export function storagePathOf(importId: string, fileId: string): string {
  return `imports/${importId}/${fileId}.xlsx`
}

function proposalOf(proposal: MappingProposal, index: number) {
  const sheet = proposal.sheets[index]
  if (!sheet) throw new Error(`no proposal for sheet ${index}`)
  return sheet
}

function toSummary(record: ImportSummaryRecord): ImportSummary {
  return {
    importId: record.importId,
    accountId: record.accountId,
    status: record.status,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    analyzedAt: record.analyzedAt?.toISOString() ?? null,
    rowsTotal: record.rowsTotal,
    rowsMatched: record.rowsMatched,
    rowsUnmatched: record.rowsUnmatched,
    currentBatchId: record.currentBatchId,
    fileCount: record.fileCount,
  }
}
