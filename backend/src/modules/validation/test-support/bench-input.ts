/**
 * Reference volume of the engine (design D8): 2 000 rows against 50 000 previous movements in 100 batches (one of
 * them undone, so absent from the history) and ~25 000 unsettled candidate transactions, from a fixed seed.
 */
import { mulberry32 } from '../../../../prisma/synthetic.js'
import type {
  CandidateTransaction,
  HeldReserve,
  HistoryMovement,
  ValidationInput,
  ValidationRow,
} from '../domain/types.js'
import { ACCOUNT_B, PROVIDER_B, STATUS, STATUSES } from './builders.js'

export const BENCH = { rows: 2_000, movements: 50_000, batches: 100, candidates: 25_000 } as const

const DAY = 86_400_000
const START = Date.UTC(2025, 10, 1)
const END = Date.UTC(2026, 9, 7)
const CHANNELS = [1011, 1012]

interface BenchTxn {
  transactionId: bigint
  channelId: number
  statusId: number
  transactionDate: Date
  lastStatusChangedAt: Date | null
}

export interface BenchInput {
  input: ValidationInput
  undoneBatchMovements: number
}

export function benchInput(seed = 20261017): BenchInput {
  const rng = mulberry32(seed)
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!

  // Settled population first, then the unsettled one: dates grow with the id.
  const txns: BenchTxn[] = []
  const make = (id: number, total: number): BenchTxn => {
    const r = rng()
    const date = new Date(START + Math.floor(((END - START) * id) / total) + Math.floor(rng() * DAY))
    const declined = r < 0.3
    const pending = !declined && r < 0.305
    const adjusted = !declined && !pending && rng() < 0.025
    const statusId = declined
      ? STATUS.Declined
      : pending
        ? STATUS.Pending
        : adjusted
          ? pick([STATUS.Chargeback, STATUS.Refund, STATUS.RDR])
          : STATUS.Successful
    return {
      transactionId: BigInt(id),
      channelId: pick(CHANNELS),
      statusId,
      transactionDate: date,
      lastStatusChangedAt: adjusted ? new Date(date.getTime() + (5 + Math.floor(rng() * 35)) * DAY) : null,
    }
  }

  // History: E of every settled transaction, I of the adjusted ones, R of the older reserves, until 50 000.
  const history: HistoryMovement[] = []
  const settled: BenchTxn[] = []
  const undoneBatchNo = 137
  let undone = 0
  const perBatch = Math.ceil(BENCH.movements / (BENCH.batches - 1))
  let id = 0
  const estimatedTotal = 72_000
  while (history.length < BENCH.movements) {
    const t = make(++id, estimatedTotal)
    txns.push(t)
    const batchNo = 100 + Math.min(BENCH.batches - 1, Math.floor(history.length / perBatch))
    const effectiveBatch = batchNo >= undoneBatchNo ? batchNo + 1 : batchNo
    const push = (cycle: 'E' | 'I' | 'R', statusId: number) =>
      history.push({
        batchId: `bench-batch-${effectiveBatch}`,
        accountId: ACCOUNT_B.accountId,
        batchNo: effectiveBatch,
        attemptNo: 1,
        batchStatus: 'paid',
        transactionId: t.transactionId,
        cycle,
        statusId,
        excludeAmount: false,
        sheetId: null,
        rowNo: history.length,
        settlementTxnId: BigInt(history.length + 1),
      })
    if (t.statusId === STATUS.Pending) continue
    // A tenth of a batch's worth of transactions went to the undone attempt: not in the history.
    if (id % 250 === 0) {
      undone++
      continue
    }
    const settledAs = t.statusId === STATUS.Declined ? STATUS.Declined : STATUS.Successful
    push('E', settledAs)
    settled.push(t)
    if (t.lastStatusChangedAt !== null) push('I', t.statusId)
    if (settledAs === STATUS.Successful && t.transactionDate.getTime() < END - 220 * DAY && rng() < 0.3)
      push('R', t.statusId)
  }

  // Unsettled population: the candidates.
  const firstUnsettled = id + 1
  for (let n = 0; n < BENCH.candidates; n++) txns.push(make(++id, estimatedTotal))
  const unsettled = txns.slice(firstUnsettled - 1)
  const candidates: CandidateTransaction[] = unsettled.map((t) => ({
    transactionId: t.transactionId,
    sourceTransactionId: String(100_000_000_000_000n + t.transactionId),
    channelId: t.channelId,
    statusId: t.statusId,
    transactionDate: t.transactionDate,
    lastStatusChangedAt: t.lastStatusChangedAt,
  }))

  // Held reserves: settled Successful E movements without an R movement.
  const released = new Set(history.filter((m) => m.cycle === 'R').map((m) => m.transactionId))
  const reserveCandidates: HeldReserve[] = settled
    .filter((t) => t.statusId !== STATUS.Declined && !released.has(t.transactionId))
    .map((t) => ({
      transactionId: t.transactionId,
      sourceTransactionId: String(100_000_000_000_000n + t.transactionId),
      channelId: t.channelId,
      statusId: t.statusId,
      transactionDate: t.transactionDate,
      batchId: 'bench-batch-100',
      reserveHeldAmt: '10.0000',
      reserveEarlyReleasedAmt: rng() < 0.01 ? '1.0000' : '0.0000',
    }))

  // 2 000 rows: the newest unsettled E (APP/DEC by gateway status), duplicates, collisions, rows already settled,
  // adjustments (some CHB 2) and reserves.
  const rows: ValidationRow[] = []
  const sheetOf = { APP: 0, DEC: 1, CHB: 2, RR: 5 } as const
  let rowNo = 1
  const add = (t: BenchTxn, sheet: keyof typeof sheetOf, statusId: number | null, excludeAmount = false) =>
    rows.push({
      fileId: 'bench-file',
      fileOrder: 0,
      sheetId: `bench-${sheet}`,
      sheetOrder: sheetOf[sheet],
      rowNo: ++rowNo,
      transactionIdRaw: String(100_000_000_000_000n + t.transactionId),
      cycle: sheet === 'CHB' ? 'I' : sheet === 'RR' ? 'R' : 'E',
      statusId,
      excludeAmount,
      matchResult: 'matched',
      transaction: {
        transactionId: t.transactionId,
        providerId: PROVIDER_B,
        channelId: t.channelId,
        statusId: t.statusId,
        transactionDate: t.transactionDate,
        lastStatusChangedAt: t.lastStatusChangedAt,
      },
    })
  const recent = unsettled.slice(-1_600).filter((t) => t.statusId !== STATUS.Pending)
  for (const t of recent.slice(0, 1_300)) {
    if (t.statusId === STATUS.Declined) add(t, 'DEC', STATUS.Declined)
    else add(t, 'APP', STATUS.Successful)
  }
  for (const t of recent.slice(0, 50)) add(t, 'APP', STATUS.Successful) // duplicates / collisions in batch
  for (const t of settled.slice(-60)) add(t, 'APP', STATUS.Successful) // already settled
  const adjusted = unsettled.filter((t) => t.lastStatusChangedAt !== null).slice(-120)
  for (const [n, t] of adjusted.entries()) add(t, 'CHB', STATUS.Chargeback, n % 10 === 0)
  for (const r of reserveCandidates.slice(0, BENCH.rows - rows.length)) {
    const t = txns[Number(r.transactionId) - 1]!
    add(t, 'RR', t.statusId)
  }

  return {
    input: {
      account: ACCOUNT_B,
      rows,
      history,
      hasPreviousBatches: true,
      candidates,
      reserveCandidates,
      registeredMissing: new Set(candidates.slice(0, 200).map((c) => `E:${c.transactionId}`)),
      statuses: STATUSES,
    },
    undoneBatchMovements: undone,
  }
}
