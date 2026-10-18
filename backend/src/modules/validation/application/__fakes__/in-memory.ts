/**
 * In-memory doubles of the five validation ports (design D3) over the synthetic world of the seed
 * (backend/prisma/synthetic.ts): the same transactions (transactionId = index + 1), the history of `world.batches`
 * through `settlementMovementsOf` (what the seed inserts), and `CHANNELS.account` as primary channels. Lists can be
 * extended with what the world does not have: undone attempts, Pending transactions, early-released reserves and
 * registered missing findings.
 */
import type { BatchStatus, Cycle } from '@recon/shared'
import { buildWorld, CHANNELS, STATUS, settlementMovementsOf } from '../../../../../prisma/synthetic.js'
import { ACCOUNT_IDS, type AccountName } from '../../../catalog/application/__fakes__/in-memory.js'
import { IMPORT_ACCOUNTS, type InMemoryImportRepository } from '../../../imports/application/__fakes__/in-memory.js'
import type { InMemoryImportRowRepository } from '../../../imports/application/__fakes__/in-memory-analysis.js'
import { reserveExpiry } from '../../domain/ranges.js'
import type {
  AccountScope,
  CandidateTransaction,
  CycleRanges,
  HeldReserve,
  HistoryMovement,
  RowTransaction,
  ValidationRow,
} from '../../domain/types.js'
import type {
  AccountScopeSource,
  MissingCandidateSource,
  RegisteredMissingSource,
  SettlementHistorySource,
  ValidationRowSource,
} from '../ports.js'

const PENDING: number = STATUS.Pending
const SUCCESSFUL: number = STATUS.Successful
const DECLINED: number = STATUS.Declined
const ADJUSTMENT_STATUSES: ReadonlySet<number> = new Set([STATUS.Chargeback, STATUS.Refund, STATUS.RDR])

export interface WorldTransaction extends RowTransaction {
  sourceTransactionId: string
}

export interface StoredMovement {
  transactionId: bigint
  cycle: Cycle
  statusId: number
  excludeAmount: boolean
  sheetId: string | null
  rowNo: number | null
  /** Decimal strings, as DECIMAL(19,4) arrives from the database. */
  reserveHeldAmt: string
  reserveEarlyReleasedAmt: string
}

export interface StoredBatch {
  batchId: string
  accountId: string
  batchNo: number
  attemptNo: number
  status: BatchStatus
  /** The import the attempt settled. */
  importId: string
  movements: StoredMovement[]
}

export interface RegisteredMissingRow {
  providerId: number
  cycle: Cycle
  transactionId: bigint
  /** The import whose (non-superseded) run registered it. */
  importId: string
}

interface WorldData {
  transactions: WorldTransaction[]
  batches: StoredBatch[]
}

let worldCache: WorldData | null = null

/** Transactions and paid batches of the seed, built once. */
export function validationWorld(): WorldData {
  if (worldCache === null) {
    const world = buildWorld()
    const idByKey = new Map(world.txns.map((t, index) => [t.key, BigInt(index + 1)]))
    const transactions = world.txns.map(
      (t, index): WorldTransaction => ({
        transactionId: BigInt(index + 1),
        sourceTransactionId: t.sourceTransactionId,
        providerId: t.providerId,
        channelId: t.channelId,
        statusId: STATUS[t.status],
        transactionDate: t.transactionDate,
        lastStatusChangedAt: t.lastStatusChangedAt,
      }),
    )
    const batches = world.batches.map(
      (plan): StoredBatch => ({
        batchId: `batch:${plan.account}:${plan.batchNo}:1`,
        accountId: ACCOUNT_IDS[plan.account as AccountName],
        batchNo: plan.batchNo,
        attemptNo: 1,
        status: plan.status,
        importId: `import:${plan.account}:${plan.batchNo}`,
        movements: settlementMovementsOf(world, plan).map((m) => ({
          transactionId: idByKey.get(m.key)!,
          cycle: m.cycle,
          statusId: m.statusId,
          excludeAmount: false,
          sheetId: null,
          rowNo: null,
          reserveHeldAmt: m.held.toFixed(4),
          reserveEarlyReleasedAmt: '0.0000',
        })),
      }),
    )
    worldCache = { transactions, batches }
  }
  return worldCache
}

const isZero = (amount: string) => /^0*(\.0*)?$/.test(amount)

/** The scope of a seed account: its provider and the channels whose primary account it is. */
export function accountScopeOf(name: AccountName): AccountScope {
  const account = IMPORT_ACCOUNTS.find((a) => a.name === name)!
  return {
    accountId: account.accountId,
    providerId: account.providerId,
    primaryChannelIds: new Set(CHANNELS.filter((c) => c.account === name).map((c) => c.channelId)),
    reserveDaysByChannel: new Map(
      CHANNELS.filter((c) => c.providerId === account.providerId).map((c) => [c.channelId, c.days] as const),
    ),
  }
}

export interface ImportSide {
  imports: InMemoryImportRepository
  rows: InMemoryImportRowRepository
}

export class InMemoryValidationSources
  implements
    ValidationRowSource,
    AccountScopeSource,
    SettlementHistorySource,
    MissingCandidateSource,
    RegisteredMissingSource
{
  private readonly transactions = new Map<bigint, WorldTransaction>()
  private readonly batches: StoredBatch[]
  private readonly registeredRows: RegisteredMissingRow[] = []

  constructor(private readonly importSide: ImportSide | null = null) {
    const world = validationWorld()
    for (const t of world.transactions) this.transactions.set(t.transactionId, t)
    this.batches = [...world.batches]
  }

  /** Test seam: a transaction the world does not have (Pending, another merchant…). */
  addTransaction(transaction: WorldTransaction): void {
    this.transactions.set(transaction.transactionId, transaction)
  }

  /** Test seam: an attempt the world does not have (undone, a second attempt…). */
  addBatch(batch: StoredBatch): void {
    this.batches.push(batch)
  }

  /** Test seam: a persistent missing finding registered by an import's run. */
  registerMissing(row: RegisteredMissingRow): void {
    this.registeredRows.push(row)
  }

  transaction(transactionId: bigint): WorldTransaction | null {
    return this.transactions.get(transactionId) ?? null
  }

  // ── ValidationRowSource ──

  async rowsOf(importId: string): Promise<ValidationRow[]> {
    const side = this.requireImportSide()
    const stored = side.imports.stored(importId)
    const files = [...stored.files].sort(
      (a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime() || a.fileName.localeCompare(b.fileName),
    )
    const fileOrder = new Map(files.map((f, index) => [f.fileId, index]))
    const sheetOrder = new Map(files.flatMap((f) => f.sheets.map((s, index) => [s.sheetId, index] as const)))
    return side.rows.rowsOf(importId).map((r) => {
      const known = r.matchResult === 'matched' && r.transactionId !== null ? this.transaction(r.transactionId) : null
      if (r.matchResult === 'matched' && known === null) throw new Error(`matched row ${r.sheetId}:${r.rowNo} unknown`)
      const detail = r.detailJson === null ? {} : (JSON.parse(r.detailJson) as { excludeAmount?: boolean })
      return {
        fileId: r.fileId,
        fileOrder: fileOrder.get(r.fileId)!,
        sheetId: r.sheetId,
        sheetOrder: sheetOrder.get(r.sheetId)!,
        rowNo: r.rowNo,
        transactionIdRaw: r.transactionIdRaw,
        cycle: r.cycle,
        statusId: r.statusId,
        excludeAmount: detail.excludeAmount === true,
        matchResult: r.matchResult,
        transaction:
          known === null
            ? null
            : {
                transactionId: known.transactionId,
                providerId: known.providerId,
                channelId: known.channelId,
                statusId: known.statusId,
                transactionDate: known.transactionDate,
                lastStatusChangedAt: known.lastStatusChangedAt,
              },
      }
    })
  }

  // ── AccountScopeSource ──

  async accountOf(importId: string): Promise<AccountScope> {
    const accountId = this.requireImportSide().imports.stored(importId).accountId
    const account = IMPORT_ACCOUNTS.find((a) => a.accountId === accountId)
    if (!account) throw new Error(`unknown account ${accountId}`)
    return accountScopeOf(account.name as AccountName)
  }

  // ── SettlementHistorySource ──

  async hasPreviousBatches(providerId: number, excludeImportId: string): Promise<boolean> {
    return this.batches.some(
      (b) => this.providerOf(b.accountId) === providerId && b.status !== 'undone' && b.importId !== excludeImportId,
    )
  }

  async movements(
    providerId: number,
    transactionIds: readonly bigint[],
    excludeImportId: string,
  ): Promise<HistoryMovement[]> {
    const wanted = new Set(transactionIds)
    const out: HistoryMovement[] = []
    for (const b of this.batches) {
      if (b.status === 'undone' || b.importId === excludeImportId || this.providerOf(b.accountId) !== providerId)
        continue
      for (const m of b.movements) {
        if (!wanted.has(m.transactionId)) continue
        out.push({
          batchId: b.batchId,
          accountId: b.accountId,
          batchNo: b.batchNo,
          attemptNo: b.attemptNo,
          batchStatus: b.status,
          transactionId: m.transactionId,
          cycle: m.cycle,
          statusId: m.statusId,
          excludeAmount: m.excludeAmount,
          sheetId: m.sheetId,
          rowNo: m.rowNo,
        })
      }
    }
    return out
  }

  // ── MissingCandidateSource ──

  async candidates(account: AccountScope, ranges: CycleRanges): Promise<CandidateTransaction[]> {
    const processed = this.processed(account.providerId)
    const pendingMax = latest(ranges.APP?.max ?? null, ranges.DEC?.max ?? null)
    const out: CandidateTransaction[] = []
    for (const t of this.transactions.values()) {
      if (t.providerId !== account.providerId || !account.primaryChannelIds.has(t.channelId)) continue
      const date = t.transactionDate
      const wanted =
        (t.statusId === SUCCESSFUL &&
          ranges.APP !== null &&
          date <= ranges.APP.max &&
          !processed.E.has(t.transactionId)) ||
        (t.statusId === DECLINED &&
          ranges.DEC !== null &&
          date <= ranges.DEC.max &&
          !processed.E.has(t.transactionId)) ||
        (ADJUSTMENT_STATUSES.has(t.statusId) &&
          ranges.I !== null &&
          t.lastStatusChangedAt !== null &&
          t.lastStatusChangedAt <= ranges.I.max &&
          !processed.I.has(t.transactionId)) ||
        (t.statusId === PENDING && pendingMax !== null && date <= pendingMax)
      if (wanted) out.push(candidateOf(t))
    }
    return out
  }

  async heldReserves(account: AccountScope, rMax: Date): Promise<HeldReserve[]> {
    const processed = this.processed(account.providerId)
    const out: HeldReserve[] = []
    for (const b of this.batches) {
      if (b.status === 'undone' || this.providerOf(b.accountId) !== account.providerId) continue
      for (const m of b.movements) {
        if (m.cycle !== 'E' || isZero(m.reserveHeldAmt) || processed.R.has(m.transactionId)) continue
        const t = this.transactions.get(m.transactionId)
        if (!t || !account.primaryChannelIds.has(t.channelId)) continue
        if (reserveExpiry(account, t.channelId, t.transactionDate) > rMax) continue
        out.push({
          transactionId: t.transactionId,
          sourceTransactionId: t.sourceTransactionId,
          channelId: t.channelId,
          statusId: t.statusId,
          transactionDate: t.transactionDate,
          batchId: b.batchId,
          reserveHeldAmt: m.reserveHeldAmt,
          reserveEarlyReleasedAmt: m.reserveEarlyReleasedAmt,
        })
      }
    }
    return out
  }

  // ── RegisteredMissingSource ──

  async registered(providerId: number): Promise<Set<string>> {
    const settledImports = new Set(this.batches.filter((b) => b.status !== 'undone').map((b) => b.importId))
    return new Set(
      this.registeredRows
        .filter((r) => r.providerId === providerId && settledImports.has(r.importId))
        .map((r) => `${r.cycle}:${r.transactionId}`),
    )
  }

  // ── helpers ──

  private requireImportSide(): ImportSide {
    if (this.importSide === null) throw new Error('these sources were built without an import side')
    return this.importSide
  }

  private providerOf(accountId: string): number | undefined {
    return IMPORT_ACCOUNTS.find((a) => a.accountId === accountId)?.providerId
  }

  /** transactionIds with a movement of each cycle in a non-undone attempt of the provider. */
  private processed(providerId: number): Record<Cycle, Set<bigint>> {
    const sets: Record<Cycle, Set<bigint>> = { E: new Set(), I: new Set(), R: new Set() }
    for (const b of this.batches) {
      if (b.status === 'undone' || this.providerOf(b.accountId) !== providerId) continue
      for (const m of b.movements) sets[m.cycle].add(m.transactionId)
    }
    return sets
  }
}

function latest(a: Date | null, b: Date | null): Date | null {
  if (a === null) return b
  if (b === null) return a
  return a > b ? a : b
}

function candidateOf(t: WorldTransaction): CandidateTransaction {
  return {
    transactionId: t.transactionId,
    sourceTransactionId: t.sourceTransactionId,
    channelId: t.channelId,
    statusId: t.statusId,
    transactionDate: t.transactionDate,
    lastStatusChangedAt: t.lastStatusChangedAt,
  }
}
