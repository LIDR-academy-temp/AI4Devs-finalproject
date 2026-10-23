import type { MatchedRow } from './partition.js'
import type { SlotOutput, ValidationContext } from './run-validations.js'
import type { StatusCatalog } from './status-catalog.js'
import type { Issue, IssueType } from './types.js'

/**
 * The reported status does not match the gateway (business decision 2, design D6), over own rows only:
 * - `non_recorded_adjustment`: an I row whose transaction the gateway holds in a natural-cycle-E status.
 * - `status_mismatch`: an E row reported Declined that the gateway holds Successful / Chargeback / Refund / RDR, or
 *   reported Successful that the gateway holds Declined. Gateway Pending is not compared; an APP row whose
 *   transaction moved on to an I status is round 1, not a finding.
 * Non-blocking; nothing excludes the row, so it stays included by default.
 */
export function nonRecordedAdjustment(ctx: ValidationContext): SlotOutput {
  const issues: Issue[] = []
  for (const r of ctx.partition.own) {
    const type = mismatchOf(r, ctx.catalog)
    if (type !== null) issues.push(issueOf(r, type))
  }
  return { applicable: ctx.partition.anyMatched, issues }
}

function mismatchOf(r: MatchedRow, catalog: StatusCatalog): IssueType | null {
  const gateway = r.transaction.statusId
  if (r.cycle === 'I') return catalog.naturalCycle(gateway) === 'E' ? 'non_recorded_adjustment' : null
  if (r.cycle !== 'E' || r.statusId === null || gateway === catalog.idOf('Pending')) return null
  const successful = catalog.idOf('Successful')
  const declined = catalog.idOf('Declined')
  // An explicit list: a status the catalog gains later never becomes a mismatch by default.
  const contradictsDeclined = new Set(
    (['Successful', 'Chargeback', 'Refund', 'RDR'] as const).map((code) => catalog.idOf(code)),
  )
  if (r.statusId === declined && contradictsDeclined.has(gateway)) return 'status_mismatch'
  if (r.statusId === successful && gateway === declined) return 'status_mismatch'
  return null
}

function issueOf(r: MatchedRow, issueType: IssueType): Issue {
  return {
    issueType,
    scope: null,
    blocking: false,
    transactionIdRaw: r.transactionIdRaw,
    transactionId: r.transaction.transactionId,
    cycle: r.cycle,
    statusId: r.statusId,
    gatewayStatusId: r.transaction.statusId,
    source: { fileId: r.fileId, sheetId: r.sheetId, rowNo: r.rowNo },
    occurrences: [],
  }
}
