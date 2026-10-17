// Use cases of the import module (README §4.2, §4.4 rows Importación; HU1). Upload, files and detail come from
// import-upload-mapping (design D6: files and database never inconsistent the dangerous way; D8: one way to build the
// detail). Confirmation, analysis, rows, resolution and cancel come from import-analyze (design D6–D13).

import type {
  AnalysisSummary,
  BatchFeeProposal,
  ChannelNotice,
  ImportDetail,
  ImportFileDetail,
  ImportRowItem,
  ImportRowsPage,
  ImportRowsQuery,
  ImportSheetDetail,
  ImportStatus,
  ImportSummary,
  MappingConfirmation,
  RowCandidate,
  RowReason,
  RowWarningCode,
  SheetMapping,
  WarningCode,
} from '@recon/shared'
import { WarningCode as WarningCodeSchema } from '@recon/shared'
import type { AuditEntry, AuditLogger } from '../../../shared/audit.js'
import { NotFoundError } from '../../../shared/errors.js'
import type { MatchingRulesRepository } from '../../matching/application/ports.js'
import {
  type ColumnProposalResult,
  type MappingProposal,
  proposeMapping,
  type SheetMappingProposal,
  type SheetProposalResult,
} from '../../matching/domain/propose-mapping.js'
import type { MatchingRules } from '../../matching/domain/rules.js'
import { statusName } from '../../matching/domain/status-alias.js'
import {
  type AnalysisLimits,
  analysisPreconditions,
  assertImportSize,
  type PreconditionSheet,
} from '../domain/analysis-preconditions.js'
import { type BatchFeeSheet, type FeeTypeRef, prefillBatchFees } from '../domain/batch-fees.js'
import { buildRowDraft, type RowContext, toNewImportRow } from '../domain/build-rows.js'
import { channelNotices } from '../domain/channel-notice.js'
import {
  CandidateNotFoundError,
  DuplicateFileError,
  FileUnreadableError,
  MappingIncompleteError,
  RowNotAmbiguousError,
} from '../domain/errors.js'
import {
  assertCanAnalyze,
  assertCanCancel,
  assertCanConfirmMapping,
  assertCanEditFiles,
  assertCanResolveRow,
} from '../domain/import-state.js'
import {
  assertKnownStatuses,
  type EffectiveMapping,
  effectiveMapping,
  type SheetFacts,
  validateMappingConfirmation,
} from '../domain/mapping-confirmation.js'
import { matchRow, type TransactionRef } from '../domain/match-rows.js'
import { candidatesFor, type IdCandidate } from '../domain/normalize-source-id.js'
import { assessReadiness, type ReadinessSheet } from '../domain/readiness.js'
import { UNPROPOSED_SHEET_KIND } from '../domain/sheet-kind-marker.js'
import { isOoxmlMagic } from '../domain/upload-policy.js'
import type { SheetDescription, WorkbookDescription } from '../domain/workbook.js'
import type {
  AccountContext,
  AccountRef,
  FeeTypeCatalog,
  FileStore,
  IdGenerator,
  ImportFileRecord,
  ImportRecord,
  ImportRepository,
  ImportRowRepository,
  ImportSheetRecord,
  ImportSummaryRecord,
  NewImportFile,
  NewImportRow,
  Scope,
  StagedUpload,
  StoredImportRow,
  TransactionLookup,
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
  rows: ImportRowRepository
  transactions: TransactionLookup
  accounts: AccountContext
  feeTypes: FeeTypeCatalog
  audit: AuditLogger
  limits: AnalysisLimits
}

/** Statuses in which the import may hold rows (cancelled only when it was analyzed before). */
const ANALYZED_STATUSES: ReadonlySet<ImportStatus> = new Set(['analyzed', 'validated', 'processed', 'cancelled'])

interface ReadUpload {
  upload: StagedUpload
  workbook: WorkbookDescription
}

interface PlannedFile extends NewImportFile {
  tempPath: string
}

/** A sheet of the import with its file bytes, what the reader describes, what the rules propose and what governs. */
interface LoadedSheet {
  file: ImportFileRecord
  bytes: Uint8Array
  sheet: ImportSheetRecord
  description: SheetDescription
  proposal: SheetMappingProposal
  effective: EffectiveMapping
}

/** What `detailJson` carries (design D5). */
interface RowDetail {
  reason?: RowReason
  warnings?: WarningCode[]
  excludeAmount?: boolean
  candidates?: RowCandidate[]
  resolvedBy?: { userId: number; at: string; gatewayId: number }
}

const pairKey = (gatewayId: number, sourceTransactionId: string) => `${gatewayId}:${sourceTransactionId}`

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
      await this.commitThenPersist(files, committed, () =>
        this.deps.imports.addFiles(importId, record.updatedAt, files),
      )
    })
    // Same as createImport: the rows are written, so the detail is built outside the cleanup scope.
    return this.detailOf(scope, importId)
  }

  async removeFile(scope: Scope, importId: string, fileId: string): Promise<ImportDetail> {
    const record = await this.requireEditable(scope, importId)
    const file = record.files.find((f) => f.fileId === fileId)
    if (!file) throw new NotFoundError('File')
    // Database first, then disk: an orphan file is harmless, a row without its file is not (design D6).
    await this.deps.imports.removeFile(importId, record.updatedAt, fileId)
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

  /** README HU1 CA4; spec: import, D6: the whole mapping, validated against the import, replaces the previous one. */
  async confirmMapping(scope: Scope, importId: string, input: MappingConfirmation): Promise<ImportDetail> {
    const record = await this.requireImport(scope, importId)
    assertCanConfirmMapping(record.status)
    const rules = await this.deps.rules.rulesFor(record.matchingRuleSetId)
    const loaded = await this.load(record, rules)
    const facts: SheetFacts[] = loaded.map((l) => ({
      sheetId: l.sheet.sheetId,
      sheetName: l.sheet.sheetName,
      headers: l.description.headers,
    }))
    const validated = validateMappingConfirmation(input, facts)
    assertKnownStatuses(validated, rules.statuses)
    await this.deps.imports.confirmMapping(
      importId,
      record.updatedAt,
      validated.map((v) => ({
        sheetId: v.sheetId,
        kind: v.kind,
        cycle: v.cycle,
        statusId: v.statusId,
        columns: v.columns,
      })),
    )
    return this.detailOf(scope, importId)
  }

  /** README HU1 CA5–CA7; spec: import, D7: preconditions, then rows, cross-match and one write. */
  async analyze(scope: Scope, importId: string): Promise<ImportDetail> {
    const record = await this.requireImport(scope, importId)
    assertCanAnalyze(record.status)
    const rules = await this.deps.rules.rulesFor(record.matchingRuleSetId)
    const loaded = await this.load(record, rules)
    const preconditions: PreconditionSheet[] = loaded.map((l) => ({
      sheetId: l.sheet.sheetId,
      sheetName: l.sheet.sheetName,
      mappingConfirmed: l.sheet.mappingConfirmed,
      kind: l.effective.kind,
      cycle: l.effective.cycle,
      statusId: l.effective.statusId,
      columns: l.effective.columns,
      rowCount: l.description.rowCount,
    }))
    const missing = analysisPreconditions(preconditions, rules.statuses)
    if (missing.length > 0) throw new MappingIncompleteError(missing)
    assertImportSize(preconditions, this.deps.limits)

    const gateways = await this.deps.accounts.gatewaysOf(record.accountId)
    const rows: NewImportRow[] = []
    let matched = 0
    let unmatched = 0
    for (const l of loaded) {
      if (l.effective.kind !== 'transactions' || l.effective.cycle === null) continue
      const { headers, rows: sheetRows } = this.deps.reader.readRows(l.bytes, l.file.fileName, l.sheet.sheetName)
      const ctx: RowContext = {
        sheetId: l.sheet.sheetId,
        headers,
        kind: 'transactions',
        cycle: l.effective.cycle,
        statusId: l.effective.statusId,
        columns: l.effective.columns,
        rules,
      }
      const drafted = sheetRows.map((row) => {
        const draft = buildRowDraft(row, ctx)
        return { draft, outcome: candidatesFor(draft.idText, draft.idLossy, gateways) }
      })
      const found = await this.lookup(
        drafted.flatMap((d) => (d.outcome.kind === 'candidates' ? d.outcome.candidates : [])),
      )
      for (const { draft, outcome } of drafted) {
        if (outcome.kind === 'ignored') {
          rows.push(toNewImportRow(draft, { matchResult: 'ignored', reason: outcome.reason }))
          continue
        }
        if (outcome.kind === 'unmatched') {
          unmatched++
          rows.push(toNewImportRow(draft, { matchResult: 'unmatched', reason: outcome.reason }))
          continue
        }
        const hits = outcome.candidates.flatMap((c) => found.get(pairKey(c.gatewayId, c.sourceTransactionId)) ?? [])
        const match = matchRow(outcome.candidates, hits)
        if (match.matchResult === 'matched') matched++
        else if (match.matchResult === 'unmatched') unmatched++
        rows.push(toNewImportRow(draft, match, outcome.idLength))
      }
    }
    await this.deps.rows.persistAnalysis(record.importId, record.updatedAt, rows, {
      rowsTotal: rows.length,
      rowsMatched: matched,
      rowsUnmatched: unmatched,
    })
    return this.detailOf(scope, importId)
  }

  /** Spec "Filas del import": the persisted rows, unmatched and ambiguous first. Empty before the analysis. */
  async listRows(scope: Scope, importId: string, query: ImportRowsQuery): Promise<ImportRowsPage> {
    const record = await this.requireImport(scope, importId)
    const rules = await this.deps.rules.rulesFor(record.matchingRuleSetId)
    const page = await this.deps.rows.page(importId, query)
    return {
      items: page.items.map((r) => toRowItem(r, rules, scope)),
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
    }
  }

  /** README HU1 CA6; spec: import, D12: the analyst picks the gateway; audited. */
  async resolveRow(
    scope: Scope,
    userId: number,
    importId: string,
    sheetId: string,
    rowNo: number,
    gatewayId: number,
  ): Promise<ImportRowItem> {
    const record = await this.requireImport(scope, importId)
    assertCanResolveRow(record.status)
    const row = await this.deps.rows.find(importId, sheetId, rowNo)
    if (!row) throw new NotFoundError('Row')
    if (row.matchResult !== 'ambiguous') throw new RowNotAmbiguousError(row.matchResult)
    const detail = parseDetail(row.detailJson)
    const candidates = detail.candidates ?? []
    const chosen = candidates.find((c) => c.gatewayId === gatewayId)
    if (!chosen) throw new CandidateNotFoundError(gatewayId, candidates)
    const resolved: RowDetail = { ...detail, resolvedBy: { userId, at: new Date().toISOString(), gatewayId } }
    await this.deps.rows.resolve(importId, sheetId, rowNo, {
      transactionId: BigInt(chosen.transactionId),
      gatewayId,
      ...(row.cycle === 'R' ? { statusId: chosen.statusId } : {}),
      detailJson: JSON.stringify(resolved),
    })
    await this.audit({
      userId,
      action: 'import.row.resolve_gateway',
      entityType: 'ImportRow',
      entityId: `${sheetId}:${rowNo}`,
      detail: { importId, gatewayId, transactionId: chosen.transactionId, candidates },
    })
    const after = await this.deps.rows.find(importId, sheetId, rowNo)
    if (!after) throw new NotFoundError('Row')
    const rules = await this.deps.rules.rulesFor(record.matchingRuleSetId)
    return toRowItem(after, rules, scope)
  }

  /** README HU1 CA8, HU2 CA8; spec: import, D13: everything is kept as evidence. */
  async cancel(scope: Scope, userId: number, importId: string): Promise<ImportDetail> {
    const record = await this.requireImport(scope, importId)
    assertCanCancel(record.status)
    await this.deps.imports.cancel(importId)
    await this.audit({
      userId,
      action: 'import.cancel',
      entityType: 'Import',
      entityId: importId,
      detail: { previousStatus: record.status },
    })
    return this.detailOf(scope, importId)
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
    assertCanEditFiles(record.status)
    return record
  }

  /** A failing audit write is logged and never undoes the action it records (same rule as auth). */
  private async audit(entry: AuditEntry): Promise<void> {
    try {
      await this.deps.audit.record(entry)
    } catch (err) {
      this.deps.log.error({ err, action: entry.action, entityId: entry.entityId }, 'audit log write failed')
    }
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

  /** Reads every file once: description, proposal with the rules in force and the mapping that governs each sheet. */
  private async load(record: ImportRecord, rules: MatchingRules): Promise<LoadedSheet[]> {
    const loaded: LoadedSheet[] = []
    for (const file of record.files) {
      const bytes = await this.deps.files.read(file.storagePath)
      const workbook = this.deps.reader.describe(bytes, file.fileName)
      const proposal = proposeMapping(workbook, rules)
      workbook.sheets.forEach((description, index) => {
        const sheet = record.sheets.find((s) => s.fileId === file.fileId && s.sheetName === description.name)
        if (!sheet) throw new Error(`sheet "${description.name}" of file ${file.fileId} is not persisted`)
        const sheetProposal = proposalOf(proposal, index)
        const effective = effectiveMapping({
          mappingConfirmed: sheet.mappingConfirmed,
          confirmed: sheet.mappingConfirmed
            ? { kind: sheet.kind, cycle: sheet.cycle, statusId: sheet.statusId, columns: sheet.columnMaps }
            : null,
          proposed: sheetProposal,
        })
        loaded.push({ file, bytes, sheet, description, proposal: sheetProposal, effective })
      })
    }
    return loaded
  }

  /** Looks up the unique candidate pairs (the adapter batches as its store needs); one entry per exact pair found. */
  private async lookup(pairs: IdCandidate[]): Promise<Map<string, TransactionRef[]>> {
    const unique = new Map<string, IdCandidate>()
    for (const pair of pairs) unique.set(pairKey(pair.gatewayId, pair.sourceTransactionId), pair)
    const found = new Map<string, TransactionRef[]>()
    if (unique.size === 0) return found
    for (const transaction of await this.deps.transactions.findByExternalIds([...unique.values()])) {
      const key = pairKey(transaction.gatewayId, transaction.sourceTransactionId)
      found.set(key, [...(found.get(key) ?? []), transaction])
    }
    return found
  }

  /** Design D8: the detail is always rebuilt from the stored files, the rules in force and the persisted rows. */
  private async detailOf(scope: Scope, importId: string): Promise<ImportDetail> {
    const record = await this.requireImport(scope, importId)
    const rules = await this.deps.rules.rulesFor(record.matchingRuleSetId)
    const loaded = await this.load(record, rules)
    const files: ImportFileDetail[] = record.files.map((file) => ({
      fileId: file.fileId,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      uploadedAt: file.uploadedAt.toISOString(),
      sheets: loaded.filter((l) => l.file.fileId === file.fileId).map((l) => sheetDetail(l, rules)),
    }))
    const readiness = assessReadiness(
      loaded.map((l) => readinessSheet(l, rules)),
      rules.statuses,
    )
    // Once analyzed (rowsTotal set) there is always a summary: zeros when the analysis produced no rows (L1).
    const analysis =
      ANALYZED_STATUSES.has(record.status) && record.rowsTotal !== null
        ? ((await this.deps.rows.summary(importId)) ?? emptyAnalysis())
        : null
    const channels = analysis === null ? null : await this.channelsOf(record, scope)
    const batchFees = analysis === null ? null : this.batchFeesOf(loaded, await this.deps.feeTypes.listAll())
    return { ...toSummary(record), files, readiness, analysis, channels, batchFees }
  }

  /** Spec "Aviso de canales" (design D9). */
  private async channelsOf(record: ImportRecord, scope: Scope): Promise<ChannelNotice[]> {
    const counts = await this.deps.rows.channelRowCounts(record.importId)
    const facts = await this.deps.accounts.channelAssignments(record.accountId, [...counts.keys()])
    return channelNotices(record.accountId, counts, facts, scope)
  }

  /** Spec "Fees por batch prellenados…" (design D10): the batch_fees sheets with a confirmed mapping, re-read from the file. */
  private batchFeesOf(loaded: LoadedSheet[], feeTypes: FeeTypeRef[]): BatchFeeProposal[] {
    const sheets: BatchFeeSheet[] = []
    for (const l of loaded) {
      if (l.effective.kind !== 'batch_fees' || !l.sheet.mappingConfirmed) continue
      const { headers, rows } = this.deps.reader.readRows(l.bytes, l.file.fileName, l.sheet.sheetName)
      sheets.push({ headers, rows, columns: l.effective.columns })
    }
    return prefillBatchFees(sheets, feeTypes)
  }
}

/** The summary of an analysis that persisted no rows (a transactions sheet with its header only). */
function emptyAnalysis(): AnalysisSummary {
  return {
    rows: { total: 0, matched: 0, unmatched: 0, ambiguous: 0, ignored: 0 },
    byCycle: { E: 0, I: 0, R: 0 },
    warnings: Object.fromEntries(WarningCodeSchema.options.map((code) => [code, 0])) as AnalysisSummary['warnings'],
  }
}

export function storagePathOf(importId: string, fileId: string): string {
  return `imports/${importId}/${fileId}.xlsx`
}

function proposalOf(proposal: MappingProposal, index: number): SheetMappingProposal {
  const sheet = proposal.sheets[index]
  if (!sheet) throw new Error(`no proposal for sheet ${index}`)
  return sheet
}

function parseDetail(detailJson: string | null): RowDetail {
  return detailJson === null ? {} : (JSON.parse(detailJson) as RowDetail)
}

function confirmedMapping(l: LoadedSheet, rules: MatchingRules): SheetMapping | null {
  if (!l.sheet.mappingConfirmed) return null
  return {
    kind: l.sheet.kind,
    cycle: l.sheet.cycle,
    statusId: l.sheet.statusId,
    statusName: statusName(l.sheet.statusId, rules),
    columns: l.sheet.columnMaps,
  }
}

function sheetDetail(l: LoadedSheet, rules: MatchingRules): ImportSheetDetail {
  const { description } = l
  return {
    sheetId: l.sheet.sheetId,
    sheetName: description.name,
    hidden: description.hidden,
    rowCount: description.rowCount,
    proposed: l.proposal.proposed,
    columns: l.proposal.columns,
    preview: description.preview.map((row) => Object.fromEntries(description.headers.map((h, i) => [h, row[i] ?? '']))),
    mappingConfirmed: l.sheet.mappingConfirmed,
    mapping: confirmedMapping(l, rules),
  }
}

/** Readiness is assessed over the mapping that governs: the confirmed one when it exists, the proposal otherwise. */
function readinessSheet(l: LoadedSheet, rules: MatchingRules): ReadinessSheet {
  const { description } = l
  let proposed: SheetProposalResult = l.proposal.proposed
  let columns: ColumnProposalResult[] = l.proposal.columns
  if (l.effective.source === 'confirmed') {
    proposed = {
      kind: l.effective.kind,
      cycle: l.effective.cycle,
      statusId: l.effective.statusId,
      statusName: statusName(l.effective.statusId, rules),
      source: l.proposal.proposed.source,
    }
    columns = l.effective.columns.map((column) => {
      const proposedColumn = l.proposal.columns.find((c) => c.sourceColumn === column.sourceColumn)
      return {
        sourceColumn: column.sourceColumn,
        targetField: column.targetField,
        source: proposedColumn?.source ?? 'none',
        ...(column.targetField === 'status' && proposedColumn?.statusValues !== undefined
          ? { statusValues: proposedColumn.statusValues }
          : {}),
      }
    })
  }
  // columnStats are parallel to the headers; readiness looks them up by the index of the mapped column.
  const columnStats = columns.map((c) => {
    const index = description.headers.indexOf(c.sourceColumn)
    return description.columnStats[index] ?? { distinctValues: [], numericCells: 0, lossyNumericCells: 0 }
  })
  return {
    sheetId: l.sheet.sheetId,
    sheetName: description.name,
    hidden: description.hidden,
    rowCount: description.rowCount,
    proposed,
    columns,
    columnStats,
  }
}

/**
 * The row as the caller may see it (spec: import, D11): the transaction of another merchant is not shown, only
 * that the row is matched (transactionId) and the read-time warning `out_of_scope_transaction`.
 */
function toRowItem(row: StoredImportRow, rules: Pick<MatchingRules, 'statuses'>, scope: Scope): ImportRowItem {
  const detail = parseDetail(row.detailJson)
  const outOfScope = row.transaction !== null && !scope.merchantIds.includes(row.transaction.merchantId)
  const transaction = outOfScope ? null : row.transaction
  const warnings: RowWarningCode[] = [
    ...(detail.warnings ?? []),
    ...(outOfScope ? (['out_of_scope_transaction'] as const) : []),
  ]
  return {
    fileId: row.fileId,
    fileName: row.fileName,
    sheetId: row.sheetId,
    sheetName: row.sheetName,
    rowNo: row.rowNo,
    cycle: row.cycle,
    matchResult: row.matchResult,
    reason: detail.reason ?? null,
    transactionIdRaw: row.transactionIdRaw,
    transactionId: row.transactionId === null ? null : String(row.transactionId),
    gatewayId: row.gatewayId,
    statusRaw: row.statusRaw,
    statusId: row.statusId,
    statusName: statusName(row.statusId, rules),
    amount: row.amount,
    currency: row.currency,
    excludeAmount: detail.excludeAmount === true,
    ignore: row.ignore,
    warnings,
    candidates: detail.candidates ?? [],
    transaction:
      transaction === null
        ? null
        : {
            transactionId: String(transaction.transactionId),
            channelId: transaction.channelId,
            channelName: transaction.channelName,
            statusId: transaction.statusId,
            statusName: transaction.statusName,
            amount: transaction.amount,
            transactionDate: transaction.transactionDate.toISOString(),
          },
    rawData: JSON.parse(row.rawData) as Record<string, string>,
  }
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
