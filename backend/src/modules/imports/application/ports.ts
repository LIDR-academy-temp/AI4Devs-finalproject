// Ports of the import application layer (design D11 of import-upload-mapping; D4, D7–D12 of import-analyze).
// Adapters live in ../infrastructure; the in-memory doubles in ./__fakes__.
import type { Readable } from 'node:stream'
import type {
  AnalysisSummary,
  Cycle,
  ImportRowsQuery,
  ImportStatus,
  MatchResult,
  SheetKind,
  SheetMappingColumn,
} from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'
import type { FeeTypeRef } from '../domain/batch-fees.js'
import type { ChannelFact } from '../domain/channel-notice.js'
import type { TransactionRef } from '../domain/match-rows.js'
import type { GatewayFormat, IdCandidate } from '../domain/normalize-source-id.js'
import type { SheetRows, WorkbookDescription } from '../domain/workbook.js'

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
  /** The confirmed columns (ImportSheetColumnMap); empty until the mapping is confirmed. */
  columnMaps: SheetMappingColumn[]
}

/** A sheet as the analyst confirmed it (validated against the import). */
export interface ConfirmedSheet {
  sheetId: string
  kind: SheetKind
  cycle: Cycle | null
  statusId: number | null
  columns: SheetMappingColumn[]
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
  /**
   * The three edits below are guarded writes (spec: import, D2; same pattern as the claim of D1): they apply only
   * while the import is `uploaded` or `mapped` and still carries the `updatedAt` the caller read; otherwise nothing
   * is written and ImportNotEditableError names the current status.
   */
  addFiles(importId: string, expectedUpdatedAt: Date, files: NewImportFile[]): Promise<void>
  /** Removes the file with its sheets, their column maps and their rows. */
  removeFile(importId: string, expectedUpdatedAt: Date, fileId: string): Promise<void>
  /** Stores the confirmed mapping of every sheet (replacing the previous one) and moves the import to `mapped`. */
  confirmMapping(importId: string, expectedUpdatedAt: Date, sheets: ConfirmedSheet[]): Promise<void>
  /**
   * Moves the import to `cancelled` only from a cancellable status, otherwise ImportNotCancellableError. Returns the
   * status it had, read by the same statement that writes (what the audit records, not what the caller read).
   */
  cancel(importId: string): Promise<ImportStatus>
}

/** A persisted row with what the listing needs around it (design D11). */
export interface StoredImportRow extends NewImportRow {
  fileId: string
  fileName: string
  sheetName: string
  /** The matched transaction, when there is one. */
  transaction: TransactionRef | null
}

export interface RowPage {
  items: StoredImportRow[]
  total: number
}

export interface RowResolutionPatch {
  transactionId: bigint
  gatewayId: number
  /** Only for an R row: the status of the chosen transaction (README §3.2 ImportRow.statusId), as the analysis sets it. */
  statusId?: number
  detailJson: string | null
}

/** One row of a transactions sheet as the analysis persists it: every column of ImportRow (design D5). */
export interface NewImportRow {
  sheetId: string
  /** Row number in the sheet (header = 1), so the analyst can find it in Excel. */
  rowNo: number
  transactionIdRaw: string | null
  transactionId: bigint | null
  gatewayId: number | null
  statusRaw: string | null
  statusId: number | null
  cycle: Cycle
  /** Decimal string with four decimals ("16.2200"), as DECIMAL(19,4) and the API carry it; never a JS number. */
  amount: string | null
  currency: string | null
  txnDate: Date | null
  feeTypeRaw: string | null
  /** The whole original row as a JSON object `header → text`, serialized. */
  rawData: string
  ignore: boolean
  matchResult: MatchResult
  /** Reason, warnings, candidates… serialized as JSON; null when there is nothing to say. */
  detailJson: string | null
}

export interface AnalysisCounters {
  rowsTotal: number
  rowsMatched: number
  rowsUnmatched: number
}

/** Persistence of the analysis rows (design D1). */
export interface ImportRowRepository {
  /**
   * Persists the analysis atomically: claims the import (status `mapped` with the `updatedAt` the caller read,
   * otherwise ImportNotMappedError), inserts the rows in statements under the SQL Server parameter limit and
   * closes with status `analyzed`, `analyzedAt` and the counters. When any step fails nothing is written.
   */
  persistAnalysis(
    importId: string,
    expectedUpdatedAt: Date,
    rows: NewImportRow[],
    counters: AnalysisCounters,
  ): Promise<void>
  /** Unmatched and ambiguous first, then matched and ignored; within a group by file, sheet name and rowNo. */
  page(importId: string, query: ImportRowsQuery): Promise<RowPage>
  find(importId: string, sheetId: string, rowNo: number): Promise<StoredImportRow | null>
  /**
   * Marks an ambiguous row as matched and bumps the import's rowsMatched, atomically. Guarded: RowNotAmbiguousError
   * when the row is no longer ambiguous, ImportNotEditableError when the import is no longer analyzed.
   */
  resolve(importId: string, sheetId: string, rowNo: number, patch: RowResolutionPatch): Promise<void>
  /** Counts over the persisted rows; null when the import has no rows. */
  summary(importId: string): Promise<AnalysisSummary | null>
  /** Matched rows per channel of their transactions. */
  channelRowCounts(importId: string): Promise<Map<number, number>>
}

/** Own transactions, looked up by external identity (design D4). Any number of pairs: the adapter batches as its store needs. */
export interface TransactionLookup {
  findByExternalIds(pairs: IdCandidate[]): Promise<TransactionRef[]>
  /** Merchant of each transaction, keyed by transactionId as a string: what a caller may see of a candidate (D11). */
  merchantsOf(transactionIds: bigint[]): Promise<Map<string, number>>
}

/** What the analysis needs to know of the account beyond the import itself (design D4, D9). */
export interface AccountContext {
  /** Gateways of the channels associated to the account; of the provider's channels when it has none (decision 1). */
  gatewaysOf(accountId: string): Promise<GatewayFormat[]>
  channelAssignments(accountId: string, channelIds: number[]): Promise<ChannelFact[]>
}

export interface FeeTypeCatalog {
  listAll(): Promise<FeeTypeRef[]>
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
  /** Every data row of one sheet, as text, within the same limits as `describe` (design D3). */
  readRows(bytes: Uint8Array, fileName: string, sheetName: string): SheetRows
}

export type IdGenerator = () => string
