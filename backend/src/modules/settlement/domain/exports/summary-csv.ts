// Summary for the merchant (design D7): nine blocks, each with its header, separated by an empty line. Every figure comes
// from the view of the attempt and the amount payable formula is never recalculated. Business dates go without
// converting; processedAt in New York time.
import type { SettledStatus, SettlementCategory, SettlementView, SettlementWarning, Skipped } from '@recon/shared'
import { auditTime } from './audit-time.js'
import { businessTime } from './business-time.js'
import { CRLF, toCsv } from './csv.js'

const CATEGORY_LABEL: Readonly<Record<SettlementCategory, string>> = {
  deposit: 'Deposits',
  declined: 'Declined',
  chargeback: 'Chargebacks',
  refund: 'Refunds',
  rdr: 'RDR',
}

const PAYMENT_LABEL: Readonly<Record<SettledStatus, string>> = {
  pending_payment: 'Pending payment',
  settled: 'Settled',
  undone: 'Undone',
}

const SKIPPED_LABEL: readonly [keyof Skipped, string][] = [
  ['ignored', 'Ignored'],
  ['unmatched', 'Unmatched'],
  ['ambiguous', 'Ambiguous'],
  ['excluded', 'Excluded'],
  ['unresolvedStatus', 'Unresolved status'],
  ['pending', 'Pending'],
]

/** Without a settlement.process audit (seeded history) the view has no issues nor skipped rows to tell (#65). */
const NOT_AVAILABLE = [['Not available', '']]

type Range = SettlementView['dateRanges']['APP']

const range = (r: Range) => (r === null ? '' : `${businessTime(r.min)} - ${businessTime(r.max)}`)

function attemptBlock(view: SettlementView): string[][] {
  return [
    ['Account', view.accountName],
    ['Batch', String(view.batchNo)],
    ['Attempt', String(view.attemptNo)],
    ['Status', view.status],
    ['Payment', PAYMENT_LABEL[view.settledStatus]],
    ['Processed by', view.approvedBy.userName],
    ['Processed at', auditTime(view.processedAt)],
    ['Settlement date', view.settlementDate ?? ''],
    ['Channels', view.channels.join('; ')],
    ['APP range (New York time)', range(view.dateRanges.APP)],
    ['DEC range (New York time)', range(view.dateRanges.DEC)],
    ['I range (New York time)', range(view.dateRanges.I)],
    ['R range (New York time)', range(view.dateRanges.R)],
  ]
}

function warningRow(w: SettlementWarning): string[] {
  switch (w.code) {
    case 'undated_adjustment':
      return [w.code, w.transactionId, `Row ${w.rowNo}${w.feeSkipped ? '; fee skipped' : ''}`]
    case 'reserve_already_released':
      return [w.code, w.transactionId, `Row ${w.rowNo}`]
    case 'fee_variant_not_applied':
      return [w.code, '', `Fee ${w.feeId}`]
    default:
      return [w.code, '', '']
  }
}

export function summaryCsv(view: SettlementView): string {
  const issues = view.validationSummary
  const blocks = [
    toCsv(['Field', 'Value'], attemptBlock(view)),
    toCsv(
      ['Category', 'Qty', 'Amount', 'Fees', 'Fee rate'],
      view.totals.map((t) => [CATEGORY_LABEL[t.category], String(t.qty), t.amount, t.feeAmount, t.feeRate ?? '']),
    ),
    toCsv(
      ['Card brand', 'Qty', 'Amount'],
      view.brandTotals.map((b) => [b.cardBrand, String(b.qty), b.amount]),
    ),
    toCsv(
      ['Fee type', 'Description', 'Source', 'Amount', 'Entered by'],
      view.batchFees.map((f) => [f.title, f.description ?? '', f.source, f.amount, f.enteredBy?.userName ?? '']),
    ),
    toCsv(
      ['Item', 'Qty', 'Amount'],
      [
        ['Reserve held', '', view.reserveHeldAmt],
        ['Reserve released', String(view.reservesReleasedQty), view.reserveReleasedAmt],
        ['Reserve released on chargeback', '', view.reserveEarlyReleasedAmt],
      ],
    ),
    toCsv(
      ['Line', 'Sign', 'Amount'],
      [...view.payableBreakdown.map((l) => [l.label, l.sign, l.amount]), ['Amount payable', '', view.amountPayable]],
    ),
    toCsv(
      ['Item', 'Count'],
      issues === null
        ? NOT_AVAILABLE
        : [
            ['Persistent', String(issues.persistent)],
            ['Resolved', String(issues.resolved)],
            ['Blocking', String(issues.blocking)],
            ['Resolved missing', String(issues.resolvedMissing)],
          ],
    ),
    // The reader sets validationSummary to null exactly when the attempt has no settlement.process audit, the only
    // source of skipped (summary-exports design D7).
    toCsv(
      ['Reason', 'Count'],
      issues === null ? NOT_AVAILABLE : SKIPPED_LABEL.map(([key, label]) => [label, String(view.skipped[key])]),
    ),
    toCsv(['Code', 'Internal transaction ID', 'Detail'], view.warnings.map(warningRow)),
  ]
  return blocks.join(CRLF)
}
