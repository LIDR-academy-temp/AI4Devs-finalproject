import type { Cycle, ValidationCode } from '@recon/shared'
import { compareCurrent, compareHistory, conflictKey } from './conflict-key.js'
import { deriveOutcome, overallBlocked } from './outcome.js'
import { type MatchedRow, partitionRows, type RowPartition } from './partition.js'
import { createStatusCatalog, type StatusCatalog } from './status-catalog.js'
import type {
  CycleRanges,
  HistoryMovement,
  Issue,
  MissingRange,
  ValidationInput,
  ValidationReport,
  ValidationResult,
} from './types.js'

/** Indexes shared by every validation (design D5), built in one pass: O(rows + history + candidates). */
export interface ValidationContext {
  input: ValidationInput
  catalog: StatusCatalog
  partition: RowPartition
  /** Own rows per `(transactionId, cycle)`, first occurrence first. */
  ownByKey: Map<string, MatchedRow[]>
  /** History per `(transactionId, cycle)`, ordered by batchNo, attemptNo, rowNo. */
  historyByKey: Map<string, HistoryMovement[]>
  /** transactionIds with a movement of that cycle in a non-undone attempt. */
  processed: Record<Cycle, Set<bigint>>
  /** transactionIds with an own row of that cycle in this import. */
  present: Record<Cycle, Set<bigint>>
  ranges: CycleRanges
}

export interface SlotOutput {
  applicable: boolean
  issues: Issue[]
}

/** One of the eight validations; a slot without `run` reports `not_implemented` (design D4). */
export interface ValidationSlot {
  code: ValidationCode
  run?: (ctx: ValidationContext) => SlotOutput
}

export const VALIDATION_SLOTS: readonly ValidationSlot[] = [
  { code: 'provider_mismatch' },
  { code: 'non_recorded_adjustment' },
  { code: 'duplicate_in_batch' },
  { code: 'status_collision_in_batch' },
  { code: 'duplicate_across_batches' },
  { code: 'status_collision_across_batches' },
  { code: 'missing_previous_to_batch' },
  { code: 'missing_in_range' },
]

const NO_RANGES: CycleRanges = { APP: null, DEC: null, I: null, R: null }

const byArrival = (a: MatchedRow, b: MatchedRow) =>
  compareCurrent(a, b) || a.fileId.localeCompare(b.fileId) || a.sheetId.localeCompare(b.sheetId)

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return groups
}

const cycleSets = (): Record<Cycle, Set<bigint>> => ({ E: new Set(), I: new Set(), R: new Set() })

export function buildContext(input: ValidationInput): ValidationContext {
  const catalog = createStatusCatalog(input.statuses)
  const partition = partitionRows(input.rows, input.account)
  partition.own.sort(byArrival)
  partition.foreign.sort(byArrival)

  const present = cycleSets()
  for (const r of partition.own) present[r.cycle].add(r.transaction.transactionId)
  const processed = cycleSets()
  for (const m of input.history) processed[m.cycle].add(m.transactionId)

  const history = [...input.history].sort(compareHistory)
  return {
    input,
    catalog,
    partition,
    ownByKey: groupBy(partition.own, (r) => conflictKey(r.transaction.transactionId, r.cycle)),
    historyByKey: groupBy(history, (m) => conflictKey(m.transactionId, m.cycle)),
    processed,
    present,
    ranges: NO_RANGES,
  }
}

const RANGE_ORDER: Record<MissingRange, number> = { APP: 0, DEC: 1, I: 2, R: 3 }
const CYCLE_ORDER: Record<Cycle, number> = { E: 0, I: 1, R: 2 }

function compareBigint(a: bigint | null, b: bigint | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -1 : 1
}

/** Findings by transactionId and cycle; missing ones by range, relevantDate, transactionId (design D5). Stable. */
function compareIssues(a: Issue, b: Issue): number {
  if (a.missingRange !== undefined && b.missingRange !== undefined) {
    return (
      RANGE_ORDER[a.missingRange] - RANGE_ORDER[b.missingRange] ||
      (a.relevantDate?.getTime() ?? 0) - (b.relevantDate?.getTime() ?? 0) ||
      compareBigint(a.transactionId, b.transactionId)
    )
  }
  return (
    compareBigint(a.transactionId, b.transactionId) ||
    (a.cycle === null ? 3 : CYCLE_ORDER[a.cycle]) - (b.cycle === null ? 3 : CYCLE_ORDER[b.cycle])
  )
}

/** The eight validations over one input (design D2, D4): same input, same report. */
export function runValidations(
  input: ValidationInput,
  slots: readonly ValidationSlot[] = VALIDATION_SLOTS,
): ValidationReport {
  const ctx = buildContext(input)
  const results: ValidationResult[] = slots.map((slot) => {
    if (!slot.run) return { code: slot.code, outcome: 'not_implemented', issueCount: 0, issues: [] }
    const { applicable, issues } = slot.run(ctx)
    const sorted = [...issues].sort(compareIssues)
    return { code: slot.code, outcome: deriveOutcome(sorted, applicable), issueCount: sorted.length, issues: sorted }
  })
  return {
    results,
    blocked: overallBlocked(results),
    ranges: ctx.ranges,
    pendingInRangeCount: 0,
    undatedAdjustmentCount: 0,
  }
}
