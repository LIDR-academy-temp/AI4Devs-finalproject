/**
 * Small hand-made builders for what the synthetic world does not have (design D9): Pending transactions, undone
 * attempts, early-released reserves, Chargeback + CHB 2 pairs, foreign-merchant rows, registered missing findings…
 */
import type { Cycle, MatchResult, ValidationCode } from '@recon/shared'
import { STATUS, type StatusCode, TRANSACTION_STATUSES } from '../../../../prisma/synthetic.js'
import type {
  AccountScope,
  CandidateTransaction,
  HeldReserve,
  HistoryMovement,
  Issue,
  StatusEntry,
  ValidationInput,
  ValidationReport,
  ValidationResult,
  ValidationRow,
} from '../domain/types.js'

export { STATUS }

export const STATUSES: StatusEntry[] = TRANSACTION_STATUSES.map((s) => ({
  statusId: s.statusId,
  code: s.code,
  cycle: s.cycle,
}))

export const PROVIDER_B = 102
export const ACCOUNT_B: AccountScope = {
  accountId: 'b0000000-0000-4000-8000-000000000001',
  providerId: PROVIDER_B,
  primaryChannelIds: new Set([1011, 1012]),
}

export const at = (iso: string) => new Date(iso)
const DEFAULT_DATE = at('2026-10-01T12:00:00.000Z')

export interface RowSpec {
  transactionId?: bigint
  cycle?: Cycle
  /** Reported status; null for an R row without status. */
  status?: StatusCode | null
  /** Status the gateway holds; defaults to the reported one (Successful when none). */
  gateway?: StatusCode
  excludeAmount?: boolean
  sheetId?: string
  sheetOrder?: number
  fileId?: string
  fileOrder?: number
  rowNo?: number
  providerId?: number
  channelId?: number
  date?: Date
  changedAt?: Date | null
  matchResult?: MatchResult
  transactionIdRaw?: string
}

let rowSequence = 1

export function row(spec: RowSpec = {}): ValidationRow {
  const transactionId = spec.transactionId ?? 1n
  const cycle = spec.cycle ?? 'E'
  const status = spec.status === undefined ? 'Successful' : spec.status
  const gateway = spec.gateway ?? status ?? 'Successful'
  const matchResult = spec.matchResult ?? 'matched'
  return {
    fileId: spec.fileId ?? 'file-1',
    fileOrder: spec.fileOrder ?? 0,
    sheetId: spec.sheetId ?? `sheet-${cycle}-${status ?? 'none'}`,
    sheetOrder: spec.sheetOrder ?? 0,
    rowNo: spec.rowNo ?? ++rowSequence,
    transactionIdRaw: spec.transactionIdRaw ?? String(transactionId),
    cycle,
    statusId: status === null ? null : STATUS[status],
    excludeAmount: spec.excludeAmount ?? false,
    matchResult,
    transaction:
      matchResult !== 'matched'
        ? null
        : {
            transactionId,
            providerId: spec.providerId ?? PROVIDER_B,
            channelId: spec.channelId ?? 1011,
            statusId: STATUS[gateway],
            transactionDate: spec.date ?? DEFAULT_DATE,
            lastStatusChangedAt: spec.changedAt === undefined ? null : spec.changedAt,
          },
  }
}

export interface MovementSpec {
  transactionId?: bigint
  cycle?: Cycle
  status?: StatusCode
  excludeAmount?: boolean
  batchId?: string
  accountId?: string
  batchNo?: number
  attemptNo?: number
  batchStatus?: 'processed' | 'paid'
  rowNo?: number | null
}

export function movement(spec: MovementSpec = {}): HistoryMovement {
  const batchNo = spec.batchNo ?? 51
  return {
    batchId: spec.batchId ?? `batch-${batchNo}`,
    accountId: spec.accountId ?? ACCOUNT_B.accountId,
    batchNo,
    attemptNo: spec.attemptNo ?? 1,
    batchStatus: spec.batchStatus ?? 'paid',
    transactionId: spec.transactionId ?? 1n,
    cycle: spec.cycle ?? 'E',
    statusId: STATUS[spec.status ?? 'Successful'],
    excludeAmount: spec.excludeAmount ?? false,
    sheetId: null,
    rowNo: spec.rowNo === undefined ? null : spec.rowNo,
  }
}

export interface CandidateSpec {
  transactionId?: bigint
  status?: StatusCode
  channelId?: number
  date?: Date
  changedAt?: Date | null
}

export function candidate(spec: CandidateSpec = {}): CandidateTransaction {
  const transactionId = spec.transactionId ?? 1n
  return {
    transactionId,
    sourceTransactionId: `src-${transactionId}`,
    channelId: spec.channelId ?? 1011,
    statusId: STATUS[spec.status ?? 'Successful'],
    transactionDate: spec.date ?? DEFAULT_DATE,
    lastStatusChangedAt: spec.changedAt === undefined ? null : spec.changedAt,
  }
}

export interface ReserveSpec {
  transactionId?: bigint
  status?: StatusCode
  channelId?: number
  date?: Date
  held?: string
  earlyReleased?: string
  batchId?: string
}

export function reserve(spec: ReserveSpec = {}): HeldReserve {
  const transactionId = spec.transactionId ?? 1n
  return {
    transactionId,
    sourceTransactionId: `src-${transactionId}`,
    channelId: spec.channelId ?? 1011,
    statusId: STATUS[spec.status ?? 'Successful'],
    transactionDate: spec.date ?? DEFAULT_DATE,
    batchId: spec.batchId ?? 'batch-40',
    reserveHeldAmt: spec.held ?? '10.0000',
    reserveEarlyReleasedAmt: spec.earlyReleased ?? '0.0000',
  }
}

export function input(overrides: Partial<ValidationInput> = {}): ValidationInput {
  return {
    account: ACCOUNT_B,
    rows: [],
    history: [],
    hasPreviousBatches: false,
    candidates: [],
    reserveCandidates: [],
    registeredMissing: new Set(),
    statuses: STATUSES,
    ...overrides,
  }
}

/** Fisher–Yates with a fixed LCG: a reproducible "different arrival order". */
export function shuffled<T>(xs: readonly T[], seed = 7): T[] {
  const out = [...xs]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** The result of one validation in a report. */
export function resultOf(report: ValidationReport, code: ValidationCode): ValidationResult {
  const found = report.results.find((r) => r.code === code)
  if (!found) throw new Error(`no result for ${code}`)
  return found
}

/** Every finding of a report, whatever validation produced it. */
export const allIssues = (report: ValidationReport): Issue[] => report.results.flatMap((r) => r.issues)

/** JSON with bigint as text, as #9 will serialize the report. */
export const jsonOf = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))
