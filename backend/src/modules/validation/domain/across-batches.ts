import { relation, statusCounts } from './conflict-key.js'
import type { MatchedRow } from './partition.js'
import type { SlotOutput, ValidationContext } from './run-validations.js'
import type { HistoryMovement, Issue, Occurrence } from './types.js'

/**
 * Per `(transactionId, cycle)` key with history (question 6): the current rows with some historical movement of the
 * same (status, excludeAmount) are a duplicate (current excluded, historical as evidence); those with some movement
 * of a different status are a collision (current included). Chargeback against CHB 2 is compatible: nothing
 * (question 7). A current row whose status is unresolved differs from every historical movement: a collision. In R the
 * status does not count: every current R row of a key with R history is a duplicate. A collision lists, as evidence,
 * the different movements and also the compatible ones (CHB 2), like the in-batch collision.
 * Independent of the in-batch detection.
 */
function acrossBatches(ctx: ValidationContext, wanted: 'same' | 'different'): SlotOutput {
  const issues: Issue[] = []
  for (const [key, rows] of ctx.ownByKey) {
    const history = ctx.historyByKey.get(key)
    if (!history) continue
    const current: MatchedRow[] = []
    const previous = new Set<HistoryMovement>()
    for (const r of rows) {
      const statusId = r.statusId
      const hits = history.filter((m) =>
        !statusCounts(r.cycle)
          ? wanted === 'same'
          : statusId === null
            ? wanted === 'different'
            : relation({ statusId, excludeAmount: r.excludeAmount }, m, ctx.catalog) === wanted,
      )
      if (hits.length === 0) continue
      current.push(r)
      for (const m of hits) previous.add(m)
      // A collision also lists the settled movements compatible with the row (CHB 2 next to its Chargeback), as the
      // in-batch collision does: nothing of the movement is left out of the finding.
      if (wanted === 'different' && statusId !== null && statusCounts(r.cycle)) {
        const row = { statusId, excludeAmount: r.excludeAmount }
        for (const m of history) if (relation(row, m, ctx.catalog) === 'compatible') previous.add(m)
      }
    }
    if (current.length === 0) continue
    const first = current[0]!
    issues.push({
      issueType: wanted === 'same' ? 'duplicate' : 'collision',
      scope: 'across_batches',
      blocking: false,
      transactionIdRaw: first.transactionIdRaw,
      transactionId: first.transaction.transactionId,
      cycle: first.cycle,
      statusId: first.statusId,
      occurrences: [
        ...current.map((r) => currentOccurrence(r, wanted === 'different')),
        ...history.filter((m) => previous.has(m)).map(previousOccurrence),
      ],
    })
  }
  return { applicable: ctx.input.hasPreviousBatches, issues }
}

function currentOccurrence(r: MatchedRow, defaultIncluded: boolean): Occurrence {
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

/** The historical movement is evidence: it stays as it was settled. */
function previousOccurrence(m: HistoryMovement): Occurrence {
  return {
    sourceType: 'previous_batch',
    batchId: m.batchId,
    batchNo: m.batchNo,
    attemptNo: m.attemptNo,
    accountId: m.accountId,
    sheetId: m.sheetId,
    rowNo: m.rowNo,
    statusId: m.statusId,
    excludeAmount: m.excludeAmount,
    defaultIncluded: true,
  }
}

export const duplicateAcrossBatches = (ctx: ValidationContext) => acrossBatches(ctx, 'same')
export const statusCollisionAcrossBatches = (ctx: ValidationContext) => acrossBatches(ctx, 'different')
