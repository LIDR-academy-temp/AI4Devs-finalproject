// Ports of the import application layer (design D11). Adapters live in ../infrastructure; the in-memory doubles in ./__fakes__.
import type { Readable } from 'node:stream'
import type { Cycle, ImportStatus, SheetKind } from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'
import type { WorkbookDescription } from '../domain/workbook.js'

export type { Scope }

export interface AccountRef {
  accountId: string
  matchingRuleSetId: number | null
}

export interface ImportFileRecord {
  fileId: string
  fileName: string
  /** Relative to the upload root (design D4). */
  storagePath: string
  sizeBytes: number
  sha256: string
  uploadedAt: Date
}

export interface ImportSheetRecord {
  sheetId: string
  fileId: string
  sheetName: string
  kind: SheetKind
  cycle: Cycle | null
  statusId: number | null
  rowCount: number
  mappingConfirmed: boolean
}

export interface ImportSummaryRecord {
  importId: string
  accountId: string
  matchingRuleSetId: number | null
  status: ImportStatus
  createdBy: { userId: number; userName: string }
  createdAt: Date
  updatedAt: Date
  analyzedAt: Date | null
  rowsTotal: number | null
  rowsMatched: number | null
  rowsUnmatched: number | null
  currentBatchId: string | null
  fileCount: number
}

export interface ImportRecord extends ImportSummaryRecord {
  /** Ordered by uploadedAt, then fileName. */
  files: ImportFileRecord[]
  sheets: ImportSheetRecord[]
}

export interface NewImportSheet {
  sheetId: string
  sheetName: string
  kind: SheetKind
  cycle: Cycle | null
  statusId: number | null
  rowCount: number
}

export interface NewImportFile {
  fileId: string
  fileName: string
  storagePath: string
  sizeBytes: number
  sha256: string
  sheets: NewImportSheet[]
}

export interface NewImport {
  importId: string
  accountId: string
  createdByUserId: number
  files: NewImportFile[]
}

/**
 * Persistence of imports, files and sheets. Every read takes the caller's scope inside the query
 * (catalog design D2): an import of an account outside the scope reads as "not found". Writes are
 * transactional: an import with its files and sheets lands whole or not at all.
 */
export interface ImportRepository {
  findAccount(scope: Scope, accountId: string): Promise<AccountRef | null>
  findImport(scope: Scope, importId: string): Promise<ImportRecord | null>
  /** Newest first. */
  listImports(scope: Scope, accountId: string, status?: ImportStatus): Promise<ImportSummaryRecord[]>
  createImport(data: NewImport): Promise<void>
  addFiles(importId: string, files: NewImportFile[]): Promise<void>
  /** Removes the file with its sheets and their column maps. */
  removeFile(importId: string, fileId: string): Promise<void>
}

/** A part received and written to the temporary area, hashed and measured on the way (design D5). */
export interface StagedUpload {
  fileName: string
  /** Relative to the upload root, under tmp/. */
  tempPath: string
  sizeBytes: number
  sha256: string
}

export interface StagedFile {
  tempPath: string
  sizeBytes: number
  sha256: string
}

/** The upload root (design D4, D6). Every path is relative to it; nothing escapes it. */
export interface FileStore {
  stage(stream: Readable): Promise<StagedFile>
  /** Moves a staged file to its final path, creating directories as needed. */
  commit(tempPath: string, storagePath: string): Promise<void>
  discard(tempPath: string): Promise<void>
  remove(storagePath: string): Promise<void>
  read(relativePath: string): Promise<Uint8Array>
}

export interface WorkbookReader {
  describe(bytes: Uint8Array, fileName: string): WorkbookDescription
}

export type IdGenerator = () => string
