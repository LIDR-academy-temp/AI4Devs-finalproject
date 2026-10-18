import { relation } from './conflict-key.js'
import type { MatchedRow } from './partition.js'
import type { SlotOutput, ValidationContext } from './run-validations.js'
import type { Issue, Occurrence } from './types.js'

/** A row with a reported status: the only ones that can be compared. */
type ComparableRow = MatchedRow & { statusId: number }

/**
 * Per `(transactionId, cycle)` key of the own rows (question 5): rows with the same (status, excludeAmount) form a
 * subgroup; each subgroup with more than one row is a duplicate (first included, the rest excluded). Subgroups that
 * are only `compatible` (Chargeback and CHB 2, question 7) merge; two or more left is a collision with the first row
 * of each, all included. Rows without a reported status cannot be compared and take no part.
 */
function groupsOf(rows: readonly MatchedRow[], ctx: ValidationContext) {
  const subgroups: ComparableRow[][] = []
  for (const r of rows) {
    if (r.statusId === null) continue
    const row = r as ComparableRow
    const same = subgroups.find((g) => relation(g[0]!, row, ctx.catalog) === 'same')
    if (same) same.push(row)
    else subgroups.push([row])
  }
  const collisionGroups: ComparableRow[][] = []
  for (const g of subgroups) {
    const compatible = collisionGroups.find((c) => relation(c[0]!, g[0]!, ctx.catalog) === 'compatible')
    if (compatible) compatible.push(g[0]!)
    else collisionGroups.push([g[0]!])
  }
  return { subgroups, collisionGroups }
}

function occurrenceOf(r: ComparableRow, defaultIncluded: boolean): Occurrence {
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

function issueOf(issueType: 'duplicate' | 'collision', first: ComparableRow, occurrences: Occurrence[]): Issue {
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
    const firsts = groupsOf(rows, ctx).collisionGroups.map((c) => c[0]!)
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
