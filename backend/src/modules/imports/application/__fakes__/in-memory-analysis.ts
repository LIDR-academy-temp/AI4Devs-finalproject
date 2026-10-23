/**
 * In-memory doubles of the analysis ports (design D4, D9–D12): the transactions of the synthetic world, the
 * account context (channels, gateways), the fee type catalog and the rows repository.
 */
import type { AnalysisSummary, ImportRowsQuery, MatchResult, WarningCode } from '@recon/shared'
import { buildWorld, CHANNELS, FEE_TYPES, GATEWAYS, PROVIDERS, STATUS } from '../../../../../prisma/synthetic.js'
import type { FeeTypeRef } from '../../domain/batch-fees.js'
import type { ChannelFact } from '../../domain/channel-notice.js'
import { ImportNotEditableError, ImportNotMappedError, RowNotAmbiguousError } from '../../domain/errors.js'
import type { TransactionRef } from '../../domain/match-rows.js'
import {
  type GatewayFormat,
  type IdCandidate,
  type IdFormat,
  SOURCE_ID_MAX_LENGTH,
} from '../../domain/normalize-source-id.js'
import type {
  AccountContext,
  AnalysisCounters,
  FeeTypeCatalog,
  ImportRowRepository,
  NewImportRow,
  RowPage,
  RowResolutionPatch,
  StoredImportRow,
  TransactionLookup,
} from '../ports.js'
import { IMPORT_ACCOUNTS, type InMemoryImportRepository } from './in-memory.js'

// ───────────────────────── Transactions: the synthetic world of the seed ─────────────────────────

let worldCache: TransactionRef[] | null = null

/** Every transaction of the seed (backend/prisma/synthetic.ts, same seed), so the samples match exactly as against SQL Server. */
export function worldTransactions(): TransactionRef[] {
  if (worldCache === null) {
    const gatewayNames = new Map<number, string>(GATEWAYS.map((g) => [g.gatewayId, g.name]))
    worldCache = buildWorld().txns.map((t, index) => ({
      transactionId: BigInt(index + 1),
      gatewayId: t.gatewayId,
      gatewayName: gatewayNames.get(t.gatewayId) ?? `Gateway ${t.gatewayId}`,
      sourceTransactionId: t.sourceTransactionId,
      channelId: t.channelId,
      channelName: t.channel,
      providerId: t.providerId,
      merchantId: t.merchantId,
      statusId: STATUS[t.status],
      statusName: t.status,
      amount: t.amount.toFixed(4),
      transactionDate: t.transactionDate,
    }))
  }
  return worldCache
}

const pairKey = (gatewayId: number, sourceTransactionId: string) => `${gatewayId}:${sourceTransactionId}`

export class InMemoryTransactionLookup implements TransactionLookup {
  private readonly byPair = new Map<string, TransactionRef>()
  private readonly byId = new Map<bigint, TransactionRef>()
  calls = 0

  constructor(transactions: TransactionRef[] = worldTransactions()) {
    for (const t of transactions) this.add(t)
  }

  add(transaction: TransactionRef): void {
    this.byPair.set(pairKey(transaction.gatewayId, transaction.sourceTransactionId), transaction)
    this.byId.set(transaction.transactionId, transaction)
  }

  async merchantsOf(transactionIds: bigint[]): Promise<Map<string, number>> {
    const merchants = new Map<string, number>()
    for (const id of transactionIds) {
      const transaction = this.byId.get(id)
      if (transaction) merchants.set(String(id), transaction.merchantId)
    }
    return merchants
  }

  byTransactionId(transactionId: bigint): TransactionRef | null {
    return this.byId.get(transactionId) ?? null
  }

  async findByExternalIds(pairs: IdCandidate[]): Promise<TransactionRef[]> {
    this.calls++
    // Same contract as the Prisma adapter: an id longer than the column never reaches the lookup (design D5).
    const tooLong = pairs.find((p) => p.sourceTransactionId.length > SOURCE_ID_MAX_LENGTH)
    if (tooLong)
      throw new Error(`source id longer than ${SOURCE_ID_MAX_LENGTH} characters: ${tooLong.sourceTransactionId}`)
    const found: TransactionRef[] = []
    for (const pair of pairs) {
      const hit = this.byPair.get(pairKey(pair.gatewayId, pair.sourceTransactionId))
      if (hit) found.push(hit)
    }
    return found
  }
}

// ───────────────────────── Account context: channels and gateways of the seed ─────────────────────────

const GATEWAY_FORMATS = new Map<number, IdFormat>(GATEWAYS.map((g) => [g.gatewayId, g.idFormat as IdFormat]))

export class InMemoryAccountContext implements AccountContext {
  private readonly overrides = new Map<string, GatewayFormat[]>()

  /** Test seam: an account with gateways the seed does not have (e.g. two numeric ones, for the ambiguous case). */
  overrideGateways(accountId: string, gateways: GatewayFormat[]): void {
    this.overrides.set(accountId, gateways)
  }

  async gatewaysOf(accountId: string): Promise<GatewayFormat[]> {
    const overridden = this.overrides.get(accountId)
    if (overridden) return structuredClone(overridden)
    const account = IMPORT_ACCOUNTS.find((a) => a.accountId === accountId)
    if (!account) return []
    const own = CHANNELS.filter((c) => c.account === account.name)
    const pool = own.length > 0 ? own : CHANNELS.filter((c) => c.providerId === account.providerId)
    const gateways = new Map<number, GatewayFormat>()
    for (const channel of pool) {
      const idFormat = GATEWAY_FORMATS.get(channel.gatewayId)
      if (idFormat) gateways.set(channel.gatewayId, { gatewayId: channel.gatewayId, idFormat })
    }
    return [...gateways.values()].sort((a, b) => a.gatewayId - b.gatewayId)
  }

  async channelAssignments(accountId: string, channelIds: number[]): Promise<ChannelFact[]> {
    const wanted = new Set(channelIds)
    return CHANNELS.filter((c) => wanted.has(c.channelId)).map((c) => {
      const account = c.account === null ? undefined : IMPORT_ACCOUNTS.find((a) => a.name === c.account)
      const primary =
        account === undefined
          ? null
          : { accountId: account.accountId, name: account.name, merchantId: account.merchantId }
      return {
        channelId: c.channelId,
        name: c.name,
        gatewayId: c.gatewayId,
        providerId: c.providerId,
        merchantId: PROVIDERS.find((p) => p.providerId === c.providerId)?.merchantId ?? 0,
        primaryAccount: primary,
        assignedToThisAccount: primary !== null && primary.accountId === accountId,
      }
    })
  }
}

export class InMemoryFeeTypeCatalog implements FeeTypeCatalog {
  async listAll(): Promise<FeeTypeRef[]> {
    return FEE_TYPES.map((f) => ({ feeTypeId: f.feeTypeId, code: f.code, title: f.title }))
  }
}

// ───────────────────────── Import rows ─────────────────────────

const MATCH_RANK: Record<MatchResult, number> = { unmatched: 0, ambiguous: 1, matched: 2, ignored: 3 }
const WARNING_CODES: WarningCode[] = [
  'negative_amount',
  'non_usd_currency',
  'amount_unparsed',
  'currency_invalid',
  'id_length',
  'lossy_numeric_id',
  'status_unresolved',
  'status_differs_from_sheet',
  'cycle_mismatch',
]

export class InMemoryImportRowRepository implements ImportRowRepository {
  private readonly rows = new Map<string, StoredImportRow[]>()
  private failWrite = false

  constructor(
    private readonly imports: InMemoryImportRepository,
    private readonly transactions: InMemoryTransactionLookup,
  ) {}

  failNextWrite(): void {
    this.failWrite = true
  }

  /** Rows persisted for an import, in insertion order (tests). */
  rowsOf(importId: string): StoredImportRow[] {
    return structuredClone(this.rows.get(importId) ?? [])
  }

  private consumeFailure(): void {
    if (this.failWrite) {
      this.failWrite = false
      throw new Error('simulated database failure')
    }
  }

  private toStored(importId: string, row: NewImportRow): StoredImportRow {
    const stored = this.imports.stored(importId)
    for (const file of stored.files) {
      const sheet = file.sheets.find((s) => s.sheetId === row.sheetId)
      if (sheet) {
        return {
          ...row,
          fileId: file.fileId,
          fileName: file.fileName,
          sheetName: sheet.sheetName,
          transaction: row.transactionId === null ? null : this.transactions.byTransactionId(row.transactionId),
        }
      }
    }
    throw new Error(`sheet ${row.sheetId} is not in import ${importId}`)
  }

  async persistAnalysis(
    importId: string,
    expectedUpdatedAt: Date,
    rows: NewImportRow[],
    counters: AnalysisCounters,
  ): Promise<void> {
    const stored = this.imports.stored(importId)
    if (stored.status !== 'mapped' || stored.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new ImportNotMappedError(stored.status, stored.status === 'mapped')
    }
    this.consumeFailure()
    this.rows.set(
      importId,
      rows.map((r) => this.toStored(importId, r)),
    )
    const now = this.imports.now()
    stored.status = 'analyzed'
    stored.analyzedAt = now
    stored.updatedAt = now
    stored.rowsTotal = counters.rowsTotal
    stored.rowsMatched = counters.rowsMatched
    stored.rowsUnmatched = counters.rowsUnmatched
  }

  private ordered(importId: string): StoredImportRow[] {
    const stored = this.imports.stored(importId)
    const uploadedAt = new Map(stored.files.map((f) => [f.fileId, f.uploadedAt.getTime()]))
    return [...(this.rows.get(importId) ?? [])].sort(
      (a, b) =>
        MATCH_RANK[a.matchResult] - MATCH_RANK[b.matchResult] ||
        (uploadedAt.get(a.fileId) ?? 0) - (uploadedAt.get(b.fileId) ?? 0) ||
        a.sheetName.localeCompare(b.sheetName) ||
        a.rowNo - b.rowNo,
    )
  }

  async page(importId: string, query: ImportRowsQuery): Promise<RowPage> {
    const filtered = this.ordered(importId).filter(
      (r) =>
        (query.match === undefined || r.matchResult === query.match) &&
        (query.sheetId === undefined || r.sheetId === query.sheetId),
    )
    const start = (query.page - 1) * query.pageSize
    return { items: structuredClone(filtered.slice(start, start + query.pageSize)), total: filtered.length }
  }

  async find(importId: string, sheetId: string, rowNo: number): Promise<StoredImportRow | null> {
    const row = (this.rows.get(importId) ?? []).find((r) => r.sheetId === sheetId && r.rowNo === rowNo)
    return row ? structuredClone(row) : null
  }

  async resolve(
    importId: string,
    sheetId: string,
    rowNo: number,
    patch: RowResolutionPatch,
  ): Promise<{ supersededRunId: number | null }> {
    this.consumeFailure()
    const row = (this.rows.get(importId) ?? []).find((r) => r.sheetId === sheetId && r.rowNo === rowNo)
    if (!row) throw new Error(`unknown row ${sheetId}:${rowNo}`)
    // The guards of the Prisma adapter: still ambiguous, import still analyzed.
    if (row.matchResult !== 'ambiguous') throw new RowNotAmbiguousError(row.matchResult)
    const status = this.imports.stored(importId).status
    if (status !== 'analyzed') throw new ImportNotEditableError(status)
    row.transactionId = patch.transactionId
    row.gatewayId = patch.gatewayId
    if (patch.statusId !== undefined) row.statusId = patch.statusId
    row.matchResult = 'matched'
    row.detailJson = patch.detailJson
    row.transaction = this.transactions.byTransactionId(patch.transactionId)
    const stored = this.imports.stored(importId)
    stored.rowsMatched = (stored.rowsMatched ?? 0) + 1
    stored.updatedAt = this.imports.now()
    return { supersededRunId: this.imports.supersedeCurrentRun(importId) }
  }

  async summary(importId: string): Promise<AnalysisSummary | null> {
    const rows = this.rows.get(importId)
    if (!rows || rows.length === 0) return null
    const counts = { total: rows.length, matched: 0, unmatched: 0, ambiguous: 0, ignored: 0 }
    const byCycle = { E: 0, I: 0, R: 0 }
    const warnings = Object.fromEntries(WARNING_CODES.map((code) => [code, 0])) as Record<WarningCode, number>
    for (const row of rows) {
      counts[row.matchResult]++
      if (!row.ignore) byCycle[row.cycle]++
      if (row.detailJson) {
        const detail = JSON.parse(row.detailJson) as { warnings?: WarningCode[] }
        for (const code of detail.warnings ?? []) warnings[code]++
      }
    }
    return { rows: counts, byCycle, warnings }
  }

  async channelRowCounts(importId: string): Promise<Map<number, number>> {
    const counts = new Map<number, number>()
    for (const row of this.rows.get(importId) ?? []) {
      if (row.matchResult !== 'matched' || row.transaction === null) continue
      counts.set(row.transaction.channelId, (counts.get(row.transaction.channelId) ?? 0) + 1)
    }
    return counts
  }
}
