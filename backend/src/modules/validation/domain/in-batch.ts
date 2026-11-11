import { relation, statusCounts } from './conflict-key.js'
import type { MatchedRow } from './partition.js'
import type { SlotOutput, ValidationContext } from './run-validations.js'
import type { Issue, Occurrence } from './types.js'

type ComparableRow = MatchedRow & { statusId: number }

/**
 * Per `(transactionId, cycle)` key of the own rows (question 5): rows with the same (status, excludeAmount) form a
 * subgroup; each subgroup with more than one row is a duplicate (first included, the rest excluded). Subgroups that
 * are only `compatible` (Chargeback and CHB 2, question 7) count as one collision group, so that pair alone is no
 * finding. A row whose status is unresolved is never a duplicate: it is a collision group of its own, so nothing is
 * resolved silently. Two or more collision groups are a collision listing the first row of every subgroup (CHB 2
 * included next to its Chargeback) and every unresolved row, all included, in arrival order.
 */
function groupsOf(
  rows: readonly MatchedRow[],
  ctx: ValidationContext,
): {
  subgroups: MatchedRow[][]
  collisionFirsts: MatchedRow[]
} {
  // R: no status, every row of the key is the same movement.
  if (!statusCounts(rows[0]!.cycle)) return { subgroups: [[...rows]], collisionFirsts: [] }
  const subgroups: ComparableRow[][] = []
  const unresolved: MatchedRow[] = []
  for (const r of rows) {
    if (r.statusId === null) {
      unresolved.push(r)
      continue
    }
    const row = r as ComparableRow
    const same = subgroups.find((g) => relation(g[0]!, row, ctx.catalog) === 'same')
    if (same) same.push(row)
    else subgroups.push([row])
  }
  const merged: ComparableRow[] = []
  for (const g of subgroups) {
    if (!merged.some((first) => relation(first, g[0]!, ctx.catalog) === 'compatible')) merged.push(g[0]!)
  }
  const collisionGroups = merged.length + unresolved.length
  const firsts = new Set<MatchedRow>([...unresolved, ...subgroups.map((g) => g[0]!)])
  return { subgroups, collisionFirsts: collisionGroups > 1 ? rows.filter((r) => firsts.has(r)) : [] }
}

function occurrenceOf(r: MatchedRow, defaultIncluded: boolean): Occurrence {
  return {
    sourceType: 'current_import',
    fileId: r.fileId,
    sheetId: r.sheetId,
    rowNo: r.rowNo,
    statusId: r.statusId,
    excludeAmount: r.excludeAmount,
    defaultIncluded,
  }
}

function issueOf(issueType: 'duplicate' | 'collision', first: MatchedRow, occurrences: Occurrence[]): Issue {
  return {
    issueType,
    scope: 'in_batch',
    blocking: false,
    transactionIdRaw: first.transactionIdRaw,
    transactionId: first.transaction.transactionId,
    cycle: first.cycle,
    statusId: first.statusId,
    occurrences,
  }
}

export function duplicateInBatch(ctx: ValidationContext): SlotOutput {
  const issues: Issue[] = []
  for (const rows of ctx.ownByKey.values()) {
    if (rows.length < 2) continue
    for (const g of groupsOf(rows, ctx).subgroups) {
      if (g.length > 1)
        issues.push(
          issueOf(
            'duplicate',
            g[0]!,
            g.map((r, i) => occurrenceOf(r, i === 0)),
          ),
        )
    }
  }
  return { applicable: ctx.partition.anyMatched, issues }
}

export function statusCollisionInBatch(ctx: ValidationContext): SlotOutput {
  const issues: Issue[] = []
  for (const rows of ctx.ownByKey.values()) {
    if (rows.length < 2) continue
    const firsts = groupsOf(rows, ctx).collisionFirsts
    if (firsts.length > 1)
      issues.push(
        issueOf(
          'collision',
          firsts[0]!,
          firsts.map((r) => occurrenceOf(r, true)),
        ),
      )
  }
  return { applicable: ctx.partition.anyMatched, issues }
}
