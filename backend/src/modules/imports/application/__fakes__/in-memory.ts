/**
 * In-memory doubles and fixtures of the import module. The rules come straight from the seed
 * (backend/prisma/synthetic.ts) so that tests and database never drift; the workbook descriptions
 * copy what the reader extracts from data/samples (sheet names, headers, row counts, first rows,
 * distinct values) so that the proposal and the service can be tested without Excel or SQL Server.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Readable } from 'node:stream'
import type { Cycle, ImportStatus, SheetKind, TargetField } from '@recon/shared'
import { strToU8 } from 'fflate'
import {
  GLOBAL_COLUMN_RULES,
  GLOBAL_SHEET_RULES,
  LEGACY_RULE_SET,
  STATUS_ALIASES,
  TRANSACTION_STATUSES,
} from '../../../../../prisma/synthetic.js'
import { ACCOUNT_IDS, LEGACY_RULE_SET_ID } from '../../../catalog/application/__fakes__/in-memory.js'
import type { MatchingRulesRepository } from '../../../matching/application/ports.js'
import type { ColumnRule, MatchingRules, RuleSet, SheetRule } from '../../../matching/domain/rules.js'
import {
  DuplicateFileError,
  FileUnreadableError,
  ImportNotCancellableError,
  ImportNotEditableError,
} from '../../domain/errors.js'
import { CANCELLABLE_STATUSES, EDITABLE_STATUSES } from '../../domain/import-state.js'
import type { ColumnStats, SheetDescription, SheetRow, SheetRows, WorkbookDescription } from '../../domain/workbook.js'
import { describeWorkbook } from '../../infrastructure/xlsx/describe-workbook.js'
import { readSheetRows } from '../../infrastructure/xlsx/row-reader.js'
import type {
  AccountRef,
  ConfirmedSheet,
  FileStore,
  IdGenerator,
  ImportFileRecord,
  ImportRecord,
  ImportRepository,
  ImportSheetRecord,
  ImportSummaryRecord,
  NewImport,
  NewImportFile,
  Scope,
  StagedFile,
  WorkbookReader,
} from '../ports.js'

export { ACCOUNT_IDS, LEGACY_RULE_SET_ID }

export function sha256Of(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

// ───────────────────────── Rules from the seed ─────────────────────────

interface SeedSheetRule {
  sheetPattern: string
  kind: string
  cycle: string | null
  statusId: number | null
  priority: number
}

interface SeedColumnRule {
  sheetPattern?: string | null
  columnPattern: string
  targetField: string
  priority: number
}

function sheetRules(rows: readonly SeedSheetRule[], offset: number): SheetRule[] {
  return rows.map((r, i) => ({
    sheetRuleId: offset + i + 1,
    sheetPattern: r.sheetPattern,
    isRegex: false,
    kind: r.kind as SheetKind,
    cycle: (r.cycle as Cycle | null) ?? null,
    statusId: r.statusId,
    priority: r.priority,
    isActive: true,
  }))
}

function columnRules(rows: readonly SeedColumnRule[], offset: number): ColumnRule[] {
  return rows.map((r, i) => ({
    columnRuleId: offset + i + 1,
    sheetPattern: r.sheetPattern ?? null,
    columnPattern: r.columnPattern,
    isRegex: false,
    targetField: r.targetField as TargetField,
    priority: r.priority,
    isActive: true,
  }))
}

export const GLOBAL_RULES: RuleSet = {
  ruleSetId: null,
  name: null,
  sheetRules: sheetRules(GLOBAL_SHEET_RULES, 0),
  columnRules: columnRules(GLOBAL_COLUMN_RULES, 0),
}

export const LEGACY_RULES: RuleSet = {
  ruleSetId: LEGACY_RULE_SET_ID,
  name: LEGACY_RULE_SET.name,
  sheetRules: sheetRules(LEGACY_RULE_SET.sheetRules, 100),
  columnRules: columnRules(LEGACY_RULE_SET.columnRules, 100),
}

const ALIASES = STATUS_ALIASES.map((a) => ({ alias: a.alias, statusId: a.statusId, excludeAmount: a.excludeAmount }))
const STATUSES = TRANSACTION_STATUSES.map((s) => ({ statusId: s.statusId, name: s.name, cycle: s.cycle as Cycle }))

/** ProviderA-USD and every account without a rule set: global rules only. */
export const RULES_FOR_PROVIDER_A: MatchingRules = {
  account: null,
  global: GLOBAL_RULES,
  aliases: ALIASES,
  statuses: STATUSES,
}

/** ProviderC-Alt: "Provider C legacy" first, then the global rules. */
export const RULES_FOR_PROVIDER_C: MatchingRules = {
  account: LEGACY_RULES,
  global: GLOBAL_RULES,
  aliases: ALIASES,
  statuses: STATUSES,
}

export class InMemoryMatchingRulesRepository implements MatchingRulesRepository {
  async rulesFor(ruleSetId: number | null): Promise<MatchingRules> {
    return structuredClone(ruleSetId === LEGACY_RULE_SET_ID ? RULES_FOR_PROVIDER_C : RULES_FOR_PROVIDER_A)
  }
}

// ───────────────────────── Workbooks as the reader describes the samples ─────────────────────────

const HIGH_CARDINALITY: ColumnStats = { distinctValues: null, numericCells: 0, lossyNumericCells: 0 }

function stats(distinctValues: string[] | null, numericCells = 0, lossyNumericCells = 0): ColumnStats {
  return { distinctValues, numericCells, lossyNumericCells }
}

/** A template sheet (ID / Amount / Currency): IDs as text, amounts numeric, one currency. */
export function templateSheet(name: string, rowCount: number, preview: string[][]): SheetDescription {
  return {
    name,
    hidden: false,
    headers: ['ID', 'Amount', 'Currency'],
    rowCount,
    preview,
    columnStats: [
      rowCount > 50 ? HIGH_CARDINALITY : stats(preview.map((r) => r[0] ?? '').filter((v) => v !== '')),
      stats(null, rowCount, 0),
      stats(rowCount > 0 ? ['USD'] : []),
    ],
  }
}

export function sheet(
  name: string,
  headers: string[],
  rowCount: number,
  preview: string[][],
  columnStats: ColumnStats[],
  hidden = false,
): SheetDescription {
  return { name, hidden, headers, rowCount, preview, columnStats }
}

const TEMPLATE_TAIL = (otherFees: string[][]): SheetDescription[] => [
  sheet('Duplicate Corrections', ['ID', 'Status', 'Amount'], 0, [], [stats([]), stats([]), stats([])]),
  sheet('CHB Alerts', ['ID', 'Type of Fee'], 0, [], [stats([]), stats([])]),
  sheet('Other Fees', ['Type of Fee', 'Amount', 'Currency'], otherFees.length, otherFees, [
    stats(otherFees.map((r) => r[0] ?? '')),
    stats(null, otherFees.length),
    stats(otherFees.length ? ['USD'] : []),
  ]),
  sheet(
    'Settings',
    ['Chargeback Alert Fee Types', 'Column B', 'Non-Transactional Fees'],
    21,
    [
      ['Chargeback Alert Fee', '', 'Annual Fee'],
      ['Chargeback Alert Fee Ethoca', '', 'Bram Fine'],
      ['Chargeback Alert Fee RDR', '', 'Chargeback Assessment Fee'],
      ['', '', 'Chargeback Order Deduction'],
      ['', '', 'Chargeback over 1%'],
    ],
    [
      stats(['Chargeback Alert Fee', 'Chargeback Alert Fee Ethoca', 'Chargeback Alert Fee RDR']),
      stats([]),
      stats(null),
    ],
    true,
  ),
]

const OTHER_FEES_CLEAN = [
  ['Wire Fee', '25', 'USD'],
  ['Settlement Fee', '15', 'USD'],
]

/** data/samples/batch-clean: 340/110/3/7/3/320 transaction rows (783), two batch fees, Settings hidden. */
export const BATCH_CLEAN_WORKBOOK: WorkbookDescription = {
  sheets: [
    templateSheet('APP', 340, [['252570479111759', '16.22', 'USD']]),
    templateSheet('DEC', 110, [['699717315840756', '218.83', 'USD']]),
    templateSheet('CHB', 3, [
      ['535044421404059', '46.67', 'USD'],
      ['433236186559229', '147.19', 'USD'],
      ['', '', ''],
    ]),
    templateSheet('REF', 7, [['175616400979144', '71.01000000000001', 'USD']]),
    templateSheet('RDR', 3, [
      ['175186502472327', '89.78', 'USD'],
      ['', '', ''],
    ]),
    templateSheet('RR', 320, [['605317920155402', '2.27', 'USD']]),
    ...TEMPLATE_TAIL(OTHER_FEES_CLEAN),
  ],
}

/** data/samples/batch-split part1: the E sheets of batch-clean; everything else empty. */
export const BATCH_SPLIT_PART1: WorkbookDescription = {
  sheets: [
    templateSheet('APP', 340, [['252570479111759', '16.22', 'USD']]),
    templateSheet('DEC', 110, [['699717315840756', '218.83', 'USD']]),
    templateSheet('CHB', 0, []),
    templateSheet('REF', 0, []),
    templateSheet('RDR', 0, []),
    templateSheet('RR', 0, []),
    ...TEMPLATE_TAIL([]),
  ],
}

/** data/samples/batch-split part2: the I and R sheets plus the batch fees. */
export const BATCH_SPLIT_PART2: WorkbookDescription = {
  sheets: [
    templateSheet('APP', 0, []),
    templateSheet('DEC', 0, []),
    templateSheet('CHB', 3, [
      ['535044421404059', '46.67', 'USD'],
      ['', '', ''],
    ]),
    templateSheet('REF', 7, [['175616400979144', '71.01000000000001', 'USD']]),
    templateSheet('RDR', 3, [['175186502472327', '89.78', 'USD']]),
    templateSheet('RR', 320, [['605317920155402', '2.27', 'USD']]),
    ...TEMPLATE_TAIL(OTHER_FEES_CLEAN),
  ],
}

const LEGACY_HEADERS = ['Merchant Order No#', 'Order Status', 'Amount USD']

/** data/samples/legacy-provider: Summary / TRX / Fail / CB with status by column; a CHB 2 row in CB. */
export const LEGACY_WORKBOOK: WorkbookDescription = {
  sheets: [
    sheet('Summary', ['Batch', 'Total'], 1, [['Batch 7', '7431.52']], [stats(['Batch 7']), stats(null, 1)]),
    sheet(
      'TRX',
      LEGACY_HEADERS,
      60,
      [['de0d5456-d2d1-4de5-9ce9-baeae3370c11', 'Successful', '174.29']],
      [HIGH_CARDINALITY, stats(['Successful']), stats(null, 60)],
    ),
    sheet(
      'Fail',
      LEGACY_HEADERS,
      20,
      [['c0871a18-65df-4d1b-abef-fcdb1c44edf0', 'Failed', '134.85']],
      [stats(['c0871a18-65df-4d1b-abef-fcdb1c44edf0']), stats(['Failed']), stats(null, 20)],
    ),
    sheet(
      'CB',
      LEGACY_HEADERS,
      1,
      [['df14616d-4b26-4ffb-9984-72717ebff6a6', 'CHB 2', '305.32']],
      [stats(['df14616d-4b26-4ffb-9984-72717ebff6a6']), stats(['CHB 2']), stats(null, 1)],
    ),
  ],
}

/** A workbook with a sheet no rule matches. */
export const UNRULED_WORKBOOK: WorkbookDescription = {
  sheets: [
    templateSheet('APP', 2, [['252570479111759', '16.22', 'USD']]),
    sheet('Bonus', ['Reference', 'Importe'], 2, [['x', '1']], [stats(['x']), stats(null, 2)]),
  ],
}

// ───────────────────────── Sample files as uploads ─────────────────────────

export interface SampleFile {
  fileName: string
  /** Stand-in bytes with the zip magic; the fake reader maps them to the description by hash. */
  bytes: Uint8Array
  /** Hand-made description; when absent the real reader describes `realFile`. */
  workbook?: WorkbookDescription
  /** The real sample under data/samples; `readRows` (and `describe` without `workbook`) delegate to the real reader over it. */
  realFile?: string
  /** Hand-made rows per sheet for fixtures without a real file. */
  rows?: Record<string, SheetRow[]>
}

function fakeXlsxBytes(tag: string): Uint8Array {
  return strToU8(`PK\u0003\u0004${tag}`)
}

const SAMPLES_DIR = path.resolve(import.meta.dirname, '../../../../../../data/samples')

export const SAMPLE_FILES = {
  batchClean: {
    fileName: 'Recon_Template_ProviderA-USD_batch-clean.xlsx',
    bytes: fakeXlsxBytes('batch-clean'),
    workbook: BATCH_CLEAN_WORKBOOK,
    realFile: 'batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx',
  },
  part1: {
    fileName: 'Recon_Template_ProviderA-USD_batch-split_part1.xlsx',
    bytes: fakeXlsxBytes('batch-split-part1'),
    workbook: BATCH_SPLIT_PART1,
    realFile: 'batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx',
  },
  part2: {
    fileName: 'Recon_Template_ProviderA-USD_batch-split_part2.xlsx',
    bytes: fakeXlsxBytes('batch-split-part2'),
    workbook: BATCH_SPLIT_PART2,
    realFile: 'batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx',
  },
  legacy: {
    fileName: 'Legacy_ProviderC-Alt_batch.xlsx',
    bytes: fakeXlsxBytes('legacy-provider'),
    workbook: LEGACY_WORKBOOK,
    realFile: 'legacy-provider/Legacy_ProviderC-Alt_batch.xlsx',
  },
  batchIssues: {
    fileName: 'Recon_Template_ProviderB-Main_batch-issues.xlsx',
    bytes: fakeXlsxBytes('batch-issues'),
    realFile: 'batch-issues/Recon_Template_ProviderB-Main_batch-issues.xlsx',
  },
  batchBlocked: {
    fileName: 'Recon_Template_ProviderB-Main_batch-blocked.xlsx',
    bytes: fakeXlsxBytes('batch-blocked'),
    realFile: 'batch-blocked/Recon_Template_ProviderB-Main_batch-blocked.xlsx',
  },
  unruled: {
    fileName: 'bonus.xlsx',
    bytes: fakeXlsxBytes('unruled'),
    workbook: UNRULED_WORKBOOK,
    rows: {
      APP: [
        { rowNo: 2, cells: ['252570479111759', '16.22', 'USD'], lossyNumeric: [] },
        { rowNo: 3, cells: ['699717315840756', '218.83', 'USD'], lossyNumeric: [] },
      ],
      Bonus: [
        { rowNo: 2, cells: ['x', '1'], lossyNumeric: [] },
        { rowNo: 3, cells: ['y', '2'], lossyNumeric: [] },
      ],
    },
  },
} satisfies Record<string, SampleFile>

interface RegisteredWorkbook {
  workbook?: WorkbookDescription
  realFile?: string
  /** The bytes are a real workbook (built in the test): the real reader handles them. */
  real?: boolean
  rows?: Record<string, SheetRow[]>
}

export class FakeWorkbookReader implements WorkbookReader {
  private readonly byHash = new Map<string, RegisteredWorkbook>()
  private readonly realBytes = new Map<string, Uint8Array>()

  constructor(samples: SampleFile[] = Object.values(SAMPLE_FILES)) {
    for (const sample of samples) this.register(sample.bytes, sample)
  }

  register(bytes: Uint8Array, source: RegisteredWorkbook): void {
    this.byHash.set(sha256Of(bytes), source)
  }

  /** Registers bytes that are a real workbook (e.g. built with xlsx/test-support): both reads go to the real reader. */
  registerReal(bytes: Uint8Array): void {
    this.byHash.set(sha256Of(bytes), { real: true })
  }

  describe(bytes: Uint8Array, fileName: string): WorkbookDescription {
    const registered = this.registered(bytes, fileName)
    if (registered.workbook) return structuredClone(registered.workbook)
    return describeWorkbook(this.realBytesOf(registered, bytes, fileName), fileName)
  }

  readRows(bytes: Uint8Array, fileName: string, sheetName: string): SheetRows {
    const registered = this.registered(bytes, fileName)
    if (registered.rows) {
      const headers = registered.workbook?.sheets.find((s) => s.name === sheetName)?.headers
      if (headers === undefined) throw new FileUnreadableError(fileName, `missing sheet ${sheetName}`)
      return { headers: [...headers], rows: structuredClone(registered.rows[sheetName] ?? []) }
    }
    return readSheetRows(this.realBytesOf(registered, bytes, fileName), fileName, sheetName)
  }

  private realBytesOf(registered: RegisteredWorkbook, bytes: Uint8Array, fileName: string): Uint8Array {
    if (registered.real) return bytes
    if (registered.realFile === undefined) throw new FileUnreadableError(fileName, 'fixture without rows')
    let real = this.realBytes.get(registered.realFile)
    if (!real) {
      real = readFileSync(path.join(SAMPLES_DIR, registered.realFile))
      this.realBytes.set(registered.realFile, real)
    }
    return real
  }

  private registered(bytes: Uint8Array, fileName: string): RegisteredWorkbook {
    const registered = this.byHash.get(sha256Of(bytes))
    if (!registered) throw new FileUnreadableError(fileName, 'not a registered fixture')
    return registered
  }
}

// ───────────────────────── File store ─────────────────────────

export class InMemoryFileStore implements FileStore {
  readonly files = new Map<string, Uint8Array>()
  private sequence = 0
  private failCommit = false

  failNextCommit(): void {
    this.failCommit = true
  }

  async stage(stream: Readable): Promise<StagedFile> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(Buffer.from(chunk))
    return this.stageBytes(Buffer.concat(chunks))
  }

  async stageBytes(bytes: Uint8Array): Promise<StagedFile> {
    const tempPath = `tmp/${++this.sequence}.part`
    this.files.set(tempPath, bytes)
    return { tempPath, sizeBytes: bytes.length, sha256: sha256Of(bytes) }
  }

  async commit(tempPath: string, storagePath: string): Promise<void> {
    if (this.failCommit) {
      this.failCommit = false
      throw new Error('simulated disk failure')
    }
    const bytes = this.files.get(tempPath)
    if (!bytes) throw new Error(`missing staged file ${tempPath}`)
    this.files.delete(tempPath)
    this.files.set(storagePath, bytes)
  }

  async discard(tempPath: string): Promise<void> {
    this.files.delete(tempPath)
  }

  async remove(storagePath: string): Promise<void> {
    this.files.delete(storagePath)
  }

  async read(relativePath: string): Promise<Uint8Array> {
    const bytes = this.files.get(relativePath)
    if (!bytes) throw new Error(`missing file ${relativePath}`)
    return bytes
  }

  paths(): string[] {
    return [...this.files.keys()].sort()
  }
}

// ───────────────────────── Import repository ─────────────────────────

interface AccountRow extends AccountRef {
  name: string
  merchantId: number
  providerId: number
}

/** Two accounts the seed does not have: one without channels (its provider has some) and one whose provider has none. */
export const NO_CHANNELS_ACCOUNT_ID = 'a0000000-0000-4000-8000-00000000ee01'
export const NO_PROVIDER_CHANNELS_ACCOUNT_ID = 'a0000000-0000-4000-8000-00000000ee02'
const PROVIDER_WITHOUT_CHANNELS = 999

export const IMPORT_ACCOUNTS: AccountRow[] = [
  {
    accountId: ACCOUNT_IDS['ProviderA-USD'],
    name: 'ProviderA-USD',
    merchantId: 1,
    providerId: 101,
    matchingRuleSetId: null,
  },
  {
    accountId: ACCOUNT_IDS['ProviderA-EUR'],
    name: 'ProviderA-EUR',
    merchantId: 1,
    providerId: 101,
    matchingRuleSetId: null,
  },
  {
    accountId: ACCOUNT_IDS['ProviderB-Main'],
    name: 'ProviderB-Main',
    merchantId: 1,
    providerId: 102,
    matchingRuleSetId: null,
  },
  {
    accountId: ACCOUNT_IDS['ProviderC-USD'],
    name: 'ProviderC-USD',
    merchantId: 2,
    providerId: 201,
    matchingRuleSetId: null,
  },
  {
    accountId: ACCOUNT_IDS['ProviderC-Alt'],
    name: 'ProviderC-Alt',
    merchantId: 2,
    providerId: 201,
    matchingRuleSetId: LEGACY_RULE_SET_ID,
  },
  { accountId: NO_CHANNELS_ACCOUNT_ID, name: 'ZZ-NoChannels', merchantId: 1, providerId: 101, matchingRuleSetId: null },
  {
    accountId: NO_PROVIDER_CHANNELS_ACCOUNT_ID,
    name: 'ZZ-NoProviderChannels',
    merchantId: 1,
    providerId: PROVIDER_WITHOUT_CHANNELS,
    matchingRuleSetId: null,
  },
]

const USER_NAMES = new Map<number, string>([
  [1, 'admin'],
  [2, 'analyst'],
  [3, 'viewer'],
])

interface StoredFile extends ImportFileRecord {
  sheets: ImportSheetRecord[]
}

export interface StoredImport extends Omit<ImportSummaryRecord, 'fileCount'> {
  files: StoredFile[]
}

export class InMemoryImportRepository implements ImportRepository {
  private readonly imports = new Map<string, StoredImport>()
  private failWrite = false
  private tick = 0

  constructor(private readonly epoch = new Date('2026-10-16T10:00:00.000Z')) {}

  failNextWrite(): void {
    this.failWrite = true
  }

  /** Test seam for states the API cannot reach yet (validated, processed…); not a port method. */
  async setStatus(importId: string, status: ImportStatus): Promise<void> {
    this.consumeFailure()
    const stored = this.stored(importId)
    stored.status = status
    stored.updatedAt = this.now()
  }

  private readonly currentRuns = new Map<string, number>()

  /** Test seam: the current validation run of an import (validation-runs), which the import doubles do not create. */
  setCurrentRun(importId: string, runId: number): void {
    this.currentRuns.set(importId, runId)
  }

  async currentRunId(importId: string): Promise<number | null> {
    return this.currentRuns.get(importId) ?? null
  }

  /** What resolving a row does to the current run (validation-runs P7): superseded, no replacement. */
  supersedeCurrentRun(importId: string): number | null {
    const runId = this.currentRuns.get(importId) ?? null
    this.currentRuns.delete(importId)
    return runId
  }

  /** The stored import, for the row repository double. */
  stored(importId: string): StoredImport {
    const stored = this.imports.get(importId)
    if (!stored) throw new Error(`unknown import ${importId}`)
    return stored
  }

  now(): Date {
    return new Date(this.epoch.getTime() + 1000 * this.tick++)
  }

  /** The guard of the Prisma adapter (spec: import, D2): editable status and the `updatedAt` the caller read. */
  private claimEditable(importId: string, expectedUpdatedAt: Date): StoredImport {
    const stored = this.stored(importId)
    if (!EDITABLE_STATUSES.has(stored.status) || stored.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new ImportNotEditableError(stored.status, EDITABLE_STATUSES.has(stored.status))
    }
    return stored
  }

  async cancel(importId: string): Promise<ImportStatus> {
    this.consumeFailure()
    const stored = this.stored(importId)
    if (!CANCELLABLE_STATUSES.has(stored.status)) throw new ImportNotCancellableError(stored.status)
    const previous = stored.status
    stored.status = 'cancelled'
    stored.updatedAt = this.now()
    return previous
  }

  private consumeFailure(): void {
    if (this.failWrite) {
      this.failWrite = false
      throw new Error('simulated database failure')
    }
  }

  private visible(scope: Scope, accountId: string): AccountRow | null {
    const account = IMPORT_ACCOUNTS.find((a) => a.accountId === accountId)
    return account && scope.merchantIds.includes(account.merchantId) ? account : null
  }

  private toRecord(stored: StoredImport): ImportRecord {
    const files = [...stored.files].sort(
      (a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime() || a.fileName.localeCompare(b.fileName),
    )
    return structuredClone({
      ...stored,
      fileCount: files.length,
      files: files.map(({ sheets: _, ...file }) => file),
      sheets: files.flatMap((f) => f.sheets),
    })
  }

  async findAccount(scope: Scope, accountId: string): Promise<AccountRef | null> {
    const account = this.visible(scope, accountId)
    return account ? { accountId: account.accountId, matchingRuleSetId: account.matchingRuleSetId } : null
  }

  async findImport(scope: Scope, importId: string): Promise<ImportRecord | null> {
    const stored = this.imports.get(importId)
    if (!stored || !this.visible(scope, stored.accountId)) return null
    return this.toRecord(stored)
  }

  async listImports(scope: Scope, accountId: string, status?: ImportStatus): Promise<ImportSummaryRecord[]> {
    if (!this.visible(scope, accountId)) return []
    return [...this.imports.values()]
      .filter((i) => i.accountId === accountId && (status === undefined || i.status === status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((i) => {
        const { files, ...summary } = this.toRecord(i)
        return { ...summary, fileCount: files.length }
      })
  }

  private storedFile(file: NewImportFile): StoredFile {
    return {
      fileId: file.fileId,
      fileName: file.fileName,
      storagePath: file.storagePath,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      uploadedAt: this.now(),
      sheets: file.sheets.map((s) => ({ ...s, fileId: file.fileId, mappingConfirmed: false, columnMaps: [] })),
    }
  }

  async confirmMapping(importId: string, expectedUpdatedAt: Date, sheets: ConfirmedSheet[]): Promise<void> {
    this.consumeFailure()
    const stored = this.claimEditable(importId, expectedUpdatedAt)
    for (const confirmed of sheets) {
      const sheet = stored.files.flatMap((f) => f.sheets).find((s) => s.sheetId === confirmed.sheetId)
      if (!sheet) throw new Error(`unknown sheet ${confirmed.sheetId}`)
      sheet.kind = confirmed.kind
      sheet.cycle = confirmed.cycle
      sheet.statusId = confirmed.statusId
      sheet.columnMaps = structuredClone(confirmed.columns)
      sheet.mappingConfirmed = true
    }
    stored.status = 'mapped'
    stored.updatedAt = this.now()
  }

  async createImport(data: NewImport): Promise<void> {
    this.consumeFailure()
    const account = IMPORT_ACCOUNTS.find((a) => a.accountId === data.accountId)
    if (!account) throw new Error(`unknown account ${data.accountId}`)
    const createdAt = this.now()
    this.imports.set(data.importId, {
      importId: data.importId,
      accountId: data.accountId,
      matchingRuleSetId: account.matchingRuleSetId,
      status: 'uploaded',
      createdBy: { userId: data.createdByUserId, userName: USER_NAMES.get(data.createdByUserId) ?? 'unknown' },
      createdAt,
      updatedAt: createdAt,
      analyzedAt: null,
      rowsTotal: null,
      rowsMatched: null,
      rowsUnmatched: null,
      currentBatchId: null,
      files: data.files.map((f) => this.storedFile(f)),
    })
  }

  async addFiles(importId: string, expectedUpdatedAt: Date, files: NewImportFile[]): Promise<void> {
    this.consumeFailure()
    const stored = this.claimEditable(importId, expectedUpdatedAt)
    for (const file of files) {
      // The UNIQUE (importId, sha256) constraint of the schema.
      const existing = stored.files.find((f) => f.sha256 === file.sha256)
      if (existing) throw new DuplicateFileError(existing.fileName, existing.fileId)
    }
    stored.files.push(...files.map((f) => this.storedFile(f)))
    stored.updatedAt = this.now()
  }

  async removeFile(importId: string, expectedUpdatedAt: Date, fileId: string): Promise<void> {
    this.consumeFailure()
    const stored = this.claimEditable(importId, expectedUpdatedAt)
    stored.files = stored.files.filter((f) => f.fileId !== fileId)
    stored.updatedAt = this.now()
  }
}

/** Deterministic UUIDs (version 4 layout) so that tests can assert on ids. */
export function sequentialIds(): IdGenerator {
  let n = 0
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
}
