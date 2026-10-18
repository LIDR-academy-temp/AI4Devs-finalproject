// In-memory stand-in for the import API (spec: import; design D12): the state machine
// uploaded → mapped → analyzed → cancelled, fingerprints of the content, the error codes and the merchant scope.
// Test files are Files whose content starts with a sample label (see `workbookOf`).
import { createHash } from 'node:crypto'
import { TRANSACTION_STATUSES } from '@recon/shared'
import { HttpResponse, http, type PathParams } from 'msw'
import type { ImportDetail, ImportRowItem, ImportStatus, MappingConfirmationBody } from '@/lib/api/types'
import { ACCOUNT_IDS, ACCOUNTS, CHANNELS, PROVIDERS, USERS, type UserName } from './fixtures'
import {
  type AccountName,
  ANALYSIS_FACTS,
  buildRows,
  defaultFileName,
  type RowSheet,
  SAMPLE_ACCOUNTS,
  SAMPLE_LABELS,
  type SampleKey,
  type SheetTemplate,
  sortRows,
  summarize,
  workbookOf,
} from './import-fixtures'

const API = '*/api/v1'
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_FILES = 10
const MAX_ROWS = 100_000
const EDITABLE: ImportStatus[] = ['uploaded', 'mapped']
const CANCELLABLE: ImportStatus[] = ['uploaded', 'mapped', 'analyzed', 'validated']

type Mapping = NonNullable<ImportDetail['files'][number]['sheets'][number]['mapping']>

interface FakeSheet {
  sheetId: string
  template: SheetTemplate
  mappingConfirmed: boolean
  mapping: Mapping | null
}

interface FakeFile {
  fileId: string
  fileName: string
  sizeBytes: number
  sha256: string
  uploadedAt: string
  label: string
  sheets: FakeSheet[]
}

export interface FakeImport {
  importId: string
  accountId: string
  status: ImportStatus
  createdBy: { userId: number; userName: string }
  createdAt: string
  updatedAt: string
  analyzedAt: string | null
  files: FakeFile[]
  rows: ImportRowItem[] | null
  channels: ImportDetail['channels']
  batchFees: ImportDetail['batchFees']
}

/** Routes of the fake import API that a test can hold or make fail. */
export type ImportRoute = 'create' | 'addFiles' | 'removeFile' | 'mapping' | 'analyze' | 'rows' | 'cancel' | 'detail'

export interface ImportRequest {
  route: ImportRoute
  method: string
  /** Path and query string. */
  url: string
  contentType: string | null
  /** Multipart parts named `files`: file name and size. */
  parts: { name: string; size: number }[]
  body: unknown
}

interface Hold {
  arrive: () => void
  released: Promise<void>
}

function freshState() {
  return {
    imports: new Map<string, FakeImport>(),
    requests: [] as ImportRequest[],
    holds: new Map<ImportRoute, Hold[]>(),
    failures: new Map<ImportRoute, { applied: boolean }[]>(),
    seq: 0,
  }
}

let state = freshState()

export function resetImports() {
  state = freshState()
}

function nextId(): string {
  state.seq += 1
  return `00000000-0000-4000-8000-${String(state.seq).padStart(12, '0')}`
}

function now(): string {
  return new Date(Date.UTC(2026, 9, 17, 10, 0, state.seq)).toISOString()
}

/** Requests the fake received, oldest first; optionally only those of one route. */
export function importRequests(route?: ImportRoute): ImportRequest[] {
  return route ? state.requests.filter((r) => r.route === route) : [...state.requests]
}

/** The next request to `route` waits until `release()`; `arrived` resolves when it reaches the fake. */
export function holdNext(route: ImportRoute) {
  let arrive!: () => void
  let release!: () => void
  const arrived = new Promise<void>((resolve) => {
    arrive = resolve
  })
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  state.holds.set(route, [...(state.holds.get(route) ?? []), { arrive, released }])
  return { arrived, release }
}

/** The next request to `route` fails as a network error, after applying its change when `applied`. */
export function failNext(route: ImportRoute, { applied }: { applied: boolean }) {
  state.failures.set(route, [...(state.failures.get(route) ?? []), { applied }])
}

/** The stored import, for tests that set up states the samples do not have. */
export function importRecord(importId: string): FakeImport {
  const record = state.imports.get(importId)
  if (!record) throw new Error(`no fake import ${importId}`)
  return record
}

/** A File standing for a sample: its content is the label, padded with zero bytes to `size` when given. */
export function sampleFile(label: string, name = defaultFileName(label), size?: number): File {
  const parts: BlobPart[] = [label]
  if (size !== undefined) parts.push(new Uint8Array(size - label.length))
  return new File(parts, name)
}

// --- Pure views over the stored import -------------------------------------------------------------------------

const statusName = (statusId: number | null) => TRANSACTION_STATUSES.find((s) => s.statusId === statusId)?.name ?? null

function accountOf(accountId: string) {
  return ACCOUNTS.find((a) => a.accountId === accountId)
}

function merchantOfAccount(accountId: string): number | null {
  const account = accountOf(accountId)
  return PROVIDERS.find((p) => p.providerId === account?.providerId)?.merchantId ?? null
}

function canSee(user: UserName, accountId: string): boolean {
  const merchantId = merchantOfAccount(accountId)
  return USERS[user].merchants.some((m) => m.merchantId === merchantId)
}

const canProcess = (user: UserName) => USERS[user].permissions.includes('settlement.process')

/** The governing mapping of a sheet: the confirmed one or, before confirming, the proposal. */
function effective(sheet: FakeSheet) {
  if (sheet.mappingConfirmed && sheet.mapping) {
    return { ...sheet.mapping, columns: sheet.mapping.columns as { sourceColumn: string; targetField: string }[] }
  }
  const { proposed, columns } = sheet.template
  return {
    kind: proposed.kind,
    cycle: proposed.cycle,
    statusId: proposed.statusId,
    statusName: proposed.statusName,
    columns: columns.flatMap((c) =>
      c.targetField ? [{ sourceColumn: c.sourceColumn, targetField: c.targetField }] : [],
    ),
  }
}

type Item = ImportDetail['readiness']['missing'][number]

/** Port of the backend's readiness (domain/readiness.ts) over the governing mapping of each sheet. */
function readinessOf(record: FakeImport): ImportDetail['readiness'] {
  const sheets = record.files.flatMap((f) => f.sheets)
  const missing: Item[] = []
  const notes: Item[] = []
  if (sheets.length === 0) {
    missing.push({ sheetId: null, sheetName: null, field: 'transactions', message: 'The import has no files' })
  } else if (!sheets.some((s) => effective(s).kind === 'transactions')) {
    missing.push({
      sheetId: null,
      sheetName: null,
      field: 'transactions',
      message: 'No sheet is proposed as transactions',
    })
  }
  for (const sheet of sheets) {
    const { sheetName, hidden, rowCount } = sheet.template
    const item = (message: string): Item => ({ sheetId: sheet.sheetId, sheetName, message })
    const lacking = (field: Item['field'], message: string): Item => ({ ...item(message), field })
    const mapping = effective(sheet)
    const has = (field: string) => mapping.columns.some((c) => c.targetField === field)
    if (mapping.kind === null) {
      missing.push(
        lacking('kind', `No rule matches sheet "${sheetName}": classify it as transactions, batch_fees or ignore`),
      )
      continue
    }
    if (hidden) notes.push(item('The sheet is hidden in the workbook'))
    if (mapping.kind === 'ignore') {
      notes.push(item(sheet.template.proposed.note ?? `Sheet "${sheetName}" is ignored`))
      continue
    }
    if (mapping.kind === 'batch_fees') {
      if (!has('feeType')) notes.push(item('No column is proposed as feeType; no batch fees will be prefilled'))
      else if (!has('amount')) notes.push(item('No column is proposed as amount; no batch fees will be prefilled'))
      continue
    }
    if (!has('transactionId')) missing.push(lacking('transactionId', 'No column is proposed as transactionId'))
    if (mapping.cycle === null) missing.push(lacking('cycle', 'The sheet rule has no cycle'))
    else if (mapping.cycle !== 'R' && mapping.statusId === null && !has('status')) {
      missing.push(lacking('status', 'No status: neither a fixed status by sheet rule nor a column proposed as status'))
    }
    if (rowCount === 0) notes.push(item('The sheet has no rows'))
    if (statusName(mapping.statusId) === 'Declined' && rowCount > 0) {
      notes.push(item('Fixed status Declined with rows: the DEC range will open at validation'))
    }
  }
  return { canAnalyze: missing.length === 0, missing, notes }
}

/** Port of the backend's analysis preconditions (domain/analysis-preconditions.ts). */
function preconditions(record: FakeImport): Item[] {
  const sheets = record.files.flatMap((f) => f.sheets)
  const missing: Item[] = []
  if (!sheets.some((s) => s.mappingConfirmed && s.mapping?.kind === 'transactions')) {
    missing.push({
      sheetId: null,
      sheetName: null,
      field: 'transactions',
      message: 'No sheet is mapped as transactions',
    })
  }
  for (const sheet of sheets) {
    const { sheetName } = sheet.template
    const at = { sheetId: sheet.sheetId, sheetName }
    if (!sheet.mappingConfirmed || !sheet.mapping) {
      missing.push({ ...at, field: 'confirmation', message: `The mapping of sheet "${sheetName}" is not confirmed` })
      continue
    }
    const { kind, cycle, statusId, columns } = sheet.mapping
    if (kind !== 'transactions') continue
    const has = (field: string) => columns.some((c) => c.targetField === field)
    if (!has('transactionId')) {
      missing.push({
        ...at,
        field: 'transactionId',
        message: `No column of sheet "${sheetName}" is mapped as transactionId`,
      })
    }
    if (cycle === null) missing.push({ ...at, field: 'cycle', message: `Sheet "${sheetName}" has no cycle` })
    else if (cycle !== 'R' && statusId === null && !has('status')) {
      missing.push({
        ...at,
        field: 'status',
        message: `Sheet "${sheetName}" has neither a fixed status nor a column mapped as status`,
      })
    }
  }
  return missing
}

/** The detail of an import; hidden forms of other merchants appear only when a test stores them. */
export function detailOf(record: FakeImport): ImportDetail {
  const analyzed = record.rows !== null
  return {
    importId: record.importId,
    accountId: record.accountId,
    status: record.status,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    analyzedAt: record.analyzedAt,
    rowsTotal: analyzed ? record.rows!.length : null,
    rowsMatched: analyzed ? record.rows!.filter((r) => r.matchResult === 'matched').length : null,
    rowsUnmatched: analyzed ? record.rows!.filter((r) => r.matchResult === 'unmatched').length : null,
    currentBatchId: null,
    fileCount: record.files.length,
    files: record.files.map((f) => ({
      fileId: f.fileId,
      fileName: f.fileName,
      sizeBytes: f.sizeBytes,
      sha256: f.sha256,
      uploadedAt: f.uploadedAt,
      sheets: f.sheets.map((s) => ({
        sheetId: s.sheetId,
        ...s.template,
        mappingConfirmed: s.mappingConfirmed,
        mapping: s.mapping,
      })),
    })),
    readiness: readinessOf(record),
    analysis: analyzed ? summarize(record.rows!) : null,
    channels: analyzed ? record.channels : null,
    batchFees: analyzed ? record.batchFees : null,
  }
}

// --- State changes ------------------------------------------------------------------------------------------------

function storeFile(label: string, fileName: string, sizeBytes: number, sha256: string): FakeFile {
  const workbook = workbookOf(label)!
  return {
    fileId: nextId(),
    fileName,
    sizeBytes,
    sha256,
    uploadedAt: now(),
    label,
    sheets: workbook.sheets.map((template) => ({
      sheetId: nextId(),
      template,
      mappingConfirmed: false,
      mapping: null,
    })),
  }
}

function confirm(record: FakeImport, body: MappingConfirmationBody) {
  for (const input of body.sheets) {
    const sheet = record.files.flatMap((f) => f.sheets).find((s) => s.sheetId === input.sheetId)!
    sheet.mappingConfirmed = true
    sheet.mapping = {
      kind: input.kind,
      cycle: input.cycle,
      statusId: input.statusId,
      statusName: statusName(input.statusId),
      columns: [...input.columns].sort((a, b) => a.sourceColumn.localeCompare(b.sourceColumn)),
    }
  }
  record.status = 'mapped'
  record.updatedAt = now()
}

function analyze(record: FakeImport) {
  const sheets: RowSheet[] = record.files.flatMap((f) =>
    f.sheets.flatMap((s) =>
      s.mapping?.kind === 'transactions' && s.mapping.cycle
        ? [
            {
              fileId: f.fileId,
              fileName: f.fileName,
              sheetId: s.sheetId,
              template: s.template,
              kind: 'transactions' as const,
              cycle: s.mapping.cycle,
              statusId: s.mapping.statusId,
              columns: s.mapping.columns,
            },
          ]
        : [],
    ),
  )
  const facts =
    ANALYSIS_FACTS[
      record.files
        .map((f) => f.label)
        .sort()
        .join('+')
    ]
  const account = accountOf(record.accountId)!
  const channel = CHANNELS.find((c) => c.providerId === account.providerId)!
  record.rows = buildRows(sheets, facts, {
    channelId: channel.channelId,
    name: channel.name,
    gatewayId: channel.gatewayId,
  })
  record.channels = facts?.channels ?? [
    {
      channelId: channel.channelId,
      name: channel.name,
      gatewayId: channel.gatewayId,
      providerId: channel.providerId,
      rowCount: record.rows.filter((r) => r.matchResult === 'matched').length,
      assignment: 'assigned',
      otherAccount: null,
      note: null,
    },
  ]
  record.batchFees = facts?.batchFees ?? []
  record.status = 'analyzed'
  record.analyzedAt = now()
  record.updatedAt = record.analyzedAt
}

/** The proposal of every sheet as a confirmation body (what "Confirm mapping" sends without changes). */
export function proposalBody(record: FakeImport): MappingConfirmationBody {
  return {
    sheets: record.files.flatMap((f) =>
      f.sheets.map((s) => {
        const { proposed, columns } = s.template
        const kind = proposed.kind ?? 'ignore'
        return {
          sheetId: s.sheetId,
          kind,
          cycle: kind === 'transactions' ? proposed.cycle : null,
          statusId: kind === 'transactions' && proposed.cycle !== 'R' ? proposed.statusId : null,
          columns:
            kind === 'ignore'
              ? []
              : columns.flatMap((c) =>
                  c.targetField ? [{ sourceColumn: c.sourceColumn, targetField: c.targetField }] : [],
                ),
        }
      }),
    ),
  }
}

export interface SeedOptions {
  account?: AccountName
  /** Status to leave the import in; validated, processed and cancelled are reached from analyzed. */
  status?: ImportStatus
  /** Labels of the files, when not the sample's own (e.g. only `batch-split_part1`). */
  labels?: string[]
  createdBy?: UserName
}

/** Stores an import of a sample directly, as if created through the API, and returns its detail. */
export function seedImport(
  sample: SampleKey,
  { account, status = 'uploaded', labels, createdBy = 'analyst' }: SeedOptions = {},
) {
  const user = USERS[createdBy]
  const created = now()
  const record: FakeImport = {
    importId: nextId(),
    accountId: ACCOUNT_IDS[account ?? SAMPLE_ACCOUNTS[sample]],
    status: 'uploaded',
    createdBy: { userId: user.userId, userName: user.userName },
    createdAt: created,
    updatedAt: created,
    analyzedAt: null,
    files: (labels ?? SAMPLE_LABELS[sample]).map((label) =>
      storeFile(label, defaultFileName(label), 30_000, fingerprint(new TextEncoder().encode(label))),
    ),
    rows: null,
    channels: null,
    batchFees: null,
  }
  state.imports.set(record.importId, record)
  if (status !== 'uploaded') confirm(record, proposalBody(record))
  if (status !== 'uploaded' && status !== 'mapped') {
    analyze(record)
    record.status = status
  }
  return detailOf(record)
}

const fingerprint = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

// --- HTTP ---------------------------------------------------------------------------------------------------------

const error = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json({ code, message, ...(details === undefined ? {} : { details }) }, { status })
const notFound = (entity: string) => error(404, 'not_found', `${entity} not found`)
const forbidden = () => error(403, 'forbidden', 'Forbidden')

interface Upload {
  label: string
  fileName: string
  sizeBytes: number
  sha256: string
}

/** Reads the `files` parts and applies the upload rules of the API, in its order; a Response means rejected. */
async function readUploads(request: Request, log: ImportRequest): Promise<Upload[] | Response> {
  const contentType = request.headers.get('content-type')
  if (!contentType?.startsWith('multipart/form-data'))
    return error(400, 'validation_error', 'Expected multipart/form-data')
  const parts = (await request.formData()).getAll('files').filter((p): p is File => typeof p !== 'string')
  log.parts = parts.map((p) => ({ name: p.name, size: p.size }))
  if (parts.length === 0) return error(400, 'validation_error', 'No files')
  if (parts.length > MAX_FILES) return error(400, 'too_many_files', `At most ${MAX_FILES} files per request`)
  const uploads: Upload[] = []
  for (const part of parts) {
    const fileName = part.name
    if (!fileName.toLowerCase().endsWith('.xlsx')) {
      return error(400, 'unsupported_file_type', 'Only .xlsx files are accepted', { fileName })
    }
    if (part.size > MAX_FILE_BYTES) return error(400, 'file_too_large', 'The file exceeds 20 MiB', { fileName })
    const bytes = new Uint8Array(await part.arrayBuffer())
    const end = bytes.indexOf(0)
    const label = new TextDecoder().decode(end === -1 ? bytes : bytes.subarray(0, end)).trim()
    if (label === 'broken' || !workbookOf(label)) {
      return error(422, 'file_unreadable', 'The file cannot be read as an xlsx workbook', { fileName })
    }
    const sha256 = fingerprint(bytes)
    if (uploads.some((u) => u.sha256 === sha256)) {
      return error(409, 'duplicate_file', 'The same file appears twice in the request', { fileId: null, fileName })
    }
    uploads.push({ label, fileName, sizeBytes: part.size, sha256 })
  }
  return uploads
}

interface RouteArgs {
  request: Request
  params: PathParams
  user: UserName
}

/** A route of the fake import API: logs the request, honours holds and network failures of the tests. */
function route(
  name: ImportRoute,
  resolve: (args: RouteArgs) => Response | Promise<Response>,
  caller: (request: Request) => UserName | null,
) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    const url = new URL(request.url)
    const log: ImportRequest = {
      route: name,
      method: request.method,
      url: url.pathname + url.search,
      contentType: request.headers.get('content-type'),
      parts: [],
      body: undefined,
    }
    state.requests.push(log)
    const hold = state.holds.get(name)?.shift()
    if (hold) {
      hold.arrive()
      await hold.released
    }
    const user = caller(request)
    if (!user) return error(401, 'unauthorized', 'Unauthorized')
    const failure = state.failures.get(name)?.shift()
    if (failure && !failure.applied) return HttpResponse.error()
    const response = await resolve({ request, params, user })
    if (failure) return HttpResponse.error()
    return response
  }
}

function visibleImport(user: UserName, importId: unknown): FakeImport | null {
  const record = state.imports.get(String(importId))
  return record && canSee(user, record.accountId) ? record : null
}

/** Shape rules of the confirmation body (backend domain/mapping-confirmation.ts), as 400 validation_error. */
function shapeError(record: FakeImport, body: MappingConfirmationBody): Response | null {
  const sheets = record.files.flatMap((f) => f.sheets)
  const invalid = (message: string, details: Record<string, unknown>) =>
    error(400, 'validation_error', message, details)
  for (const input of body.sheets) {
    if (!sheets.some((s) => s.sheetId === input.sheetId)) {
      return invalid(`Sheet ${input.sheetId} does not belong to this import`, { sheetId: input.sheetId })
    }
  }
  for (const sheet of sheets) {
    const sheetName = sheet.template.sheetName
    const at = { sheetId: sheet.sheetId, sheetName }
    const inputs = body.sheets.filter((s) => s.sheetId === sheet.sheetId)
    if (inputs.length !== 1) return invalid(`Sheet "${sheetName}" is missing from the confirmation`, at)
    const input = inputs[0]!
    const headers = new Set(sheet.template.columns.map((c) => c.sourceColumn))
    const targets = new Set<string>()
    for (const column of input.columns) {
      if (!headers.has(column.sourceColumn)) {
        return invalid(`Column "${column.sourceColumn}" is not in the header of sheet "${sheetName}"`, {
          ...at,
          sourceColumn: column.sourceColumn,
        })
      }
      if (column.targetField === 'gateway') {
        return invalid('Target field "gateway" is not supported in this version', {
          ...at,
          sourceColumn: column.sourceColumn,
          targetField: column.targetField,
        })
      }
      if (targets.has(column.targetField)) {
        return invalid(`Target field "${column.targetField}" is mapped more than once in sheet "${sheetName}"`, {
          ...at,
          targetField: column.targetField,
        })
      }
      targets.add(column.targetField)
    }
    if (input.kind === 'transactions' && input.cycle === null) {
      return invalid(`Sheet "${sheetName}" is a transactions sheet without a cycle`, { ...at, field: 'cycle' })
    }
    if (input.kind === 'transactions' && input.cycle === 'R' && input.statusId !== null) {
      return invalid(`Sheet "${sheetName}" is a reserve (R) sheet: it has no status`, { ...at, field: 'statusId' })
    }
    if (input.kind !== 'transactions' && input.cycle !== null) {
      return invalid(`Sheet "${sheetName}" is ${input.kind}: it has no cycle`, { ...at, field: 'cycle' })
    }
    if (input.kind !== 'transactions' && input.statusId !== null) {
      return invalid(`Sheet "${sheetName}" is ${input.kind}: it has no statusId`, { ...at, field: 'statusId' })
    }
  }
  return null
}

export function createImportHandlers(caller: (request: Request) => UserName | null) {
  const notEditable = (record: FakeImport) =>
    error(409, 'import_not_editable', 'The import cannot be edited in its status', { status: record.status })

  return [
    http.post(
      `${API}/accounts/:accountId/imports`,
      route(
        'create',
        async ({ request, params, user }) => {
          if (!canProcess(user)) return forbidden()
          const accountId = String(params.accountId)
          if (!accountOf(accountId) || !canSee(user, accountId)) return notFound('Account')
          const uploads = await readUploads(request, state.requests.at(-1)!)
          if (uploads instanceof Response) return uploads
          const created = now()
          const record: FakeImport = {
            importId: nextId(),
            accountId,
            status: 'uploaded',
            createdBy: { userId: USERS[user].userId, userName: USERS[user].userName },
            createdAt: created,
            updatedAt: created,
            analyzedAt: null,
            files: uploads.map((u) => storeFile(u.label, u.fileName, u.sizeBytes, u.sha256)),
            rows: null,
            channels: null,
            batchFees: null,
          }
          state.imports.set(record.importId, record)
          return HttpResponse.json(detailOf(record), { status: 201 })
        },
        caller,
      ),
    ),

    http.post(
      `${API}/imports/:importId/files`,
      route(
        'addFiles',
        async ({ request, params, user }) => {
          const record = visibleImport(user, params.importId)
          if (!canProcess(user)) return record ? forbidden() : notFound('Import')
          if (!record) return notFound('Import')
          if (!EDITABLE.includes(record.status)) return notEditable(record)
          const uploads = await readUploads(request, state.requests.at(-1)!)
          if (uploads instanceof Response) return uploads
          for (const upload of uploads) {
            const original = record.files.find((f) => f.sha256 === upload.sha256)
            if (original) {
              return error(409, 'duplicate_file', 'The file is already in the import', {
                fileId: original.fileId,
                fileName: original.fileName,
              })
            }
          }
          record.files.push(...uploads.map((u) => storeFile(u.label, u.fileName, u.sizeBytes, u.sha256)))
          record.updatedAt = now()
          return HttpResponse.json(detailOf(record))
        },
        caller,
      ),
    ),

    http.delete(
      `${API}/imports/:importId/files/:fileId`,
      route(
        'removeFile',
        ({ params, user }) => {
          const record = visibleImport(user, params.importId)
          if (!canProcess(user)) return record ? forbidden() : notFound('Import')
          if (!record) return notFound('Import')
          if (!EDITABLE.includes(record.status)) return notEditable(record)
          const index = record.files.findIndex((f) => f.fileId === params.fileId)
          if (index === -1) return notFound('File')
          record.files.splice(index, 1)
          record.updatedAt = now()
          return HttpResponse.json(detailOf(record))
        },
        caller,
      ),
    ),

    http.get(
      `${API}/imports/:importId`,
      route(
        'detail',
        ({ params, user }) => {
          const record = visibleImport(user, params.importId)
          return record ? HttpResponse.json(detailOf(record)) : notFound('Import')
        },
        caller,
      ),
    ),

    http.put(
      `${API}/imports/:importId/mapping`,
      route(
        'mapping',
        async ({ request, params, user }) => {
          const record = visibleImport(user, params.importId)
          if (!canProcess(user)) return record ? forbidden() : notFound('Import')
          if (!record) return notFound('Import')
          const body = (await request.json()) as MappingConfirmationBody
          state.requests.at(-1)!.body = body
          if (!EDITABLE.includes(record.status)) return notEditable(record)
          const invalid = shapeError(record, body)
          if (invalid) return invalid
          confirm(record, body)
          return HttpResponse.json(detailOf(record))
        },
        caller,
      ),
    ),

    http.post(
      `${API}/imports/:importId/analyze`,
      route(
        'analyze',
        ({ params, user }) => {
          const record = visibleImport(user, params.importId)
          if (!canProcess(user)) return record ? forbidden() : notFound('Import')
          if (!record) return notFound('Import')
          if (record.status !== 'mapped') {
            return error(409, 'import_not_mapped', 'The import is not mapped', { status: record.status })
          }
          const missing = preconditions(record)
          if (missing.length > 0) return error(422, 'mapping_incomplete', 'The mapping is incomplete', { missing })
          const rows = record.files
            .flatMap((f) => f.sheets)
            .reduce((sum, s) => (s.mapping?.kind === 'transactions' ? sum + s.template.rowCount : sum), 0)
          if (rows > MAX_ROWS) {
            return error(422, 'import_too_large', 'The import has too many rows', { rows, limit: MAX_ROWS })
          }
          analyze(record)
          return HttpResponse.json(detailOf(record))
        },
        caller,
      ),
    ),

    http.get(
      `${API}/imports/:importId/rows`,
      route(
        'rows',
        ({ request, params, user }) => {
          const record = visibleImport(user, params.importId)
          if (!record) return notFound('Import')
          const query = new URL(request.url).searchParams
          const match = query.get('match')
          const page = Number(query.get('page') ?? '1')
          const pageSize = Number(query.get('pageSize') ?? '50')
          const valid =
            (match === null || ['matched', 'unmatched', 'ambiguous', 'ignored'].includes(match)) &&
            Number.isInteger(page) &&
            page >= 1 &&
            Number.isInteger(pageSize) &&
            pageSize >= 1 &&
            pageSize <= 500
          if (!valid) return error(400, 'validation_error', 'Invalid query')
          const all = sortRows(
            (record.rows ?? []).filter((r) => match === null || r.matchResult === match),
            record.files.map((f) => f.fileId),
          )
          return HttpResponse.json({
            items: all.slice((page - 1) * pageSize, page * pageSize),
            page,
            pageSize,
            total: all.length,
          })
        },
        caller,
      ),
    ),

    http.post(
      `${API}/imports/:importId/cancel`,
      route(
        'cancel',
        ({ params, user }) => {
          const record = visibleImport(user, params.importId)
          if (!canProcess(user)) return record ? forbidden() : notFound('Import')
          if (!record) return notFound('Import')
          if (!CANCELLABLE.includes(record.status)) {
            return error(409, 'import_not_cancellable', 'The import cannot be cancelled', { status: record.status })
          }
          record.status = 'cancelled'
          record.updatedAt = now()
          return HttpResponse.json(detailOf(record))
        },
        caller,
      ),
    ),
  ]
}
