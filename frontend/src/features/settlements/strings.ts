// Texts of Settlement Review and Settlement Summary (web-shell "Textos de interfaz en inglés y centralizados").
// Those fixed by the spec of web-settlement are literal.
import type { ImportStatus } from '@recon/shared'
import type { Category, PayableLineCode, SettlementWarning, Skipped } from './contract'

export const strings = {
  batch: {
    title: 'Batch',
    batchNo: 'Batch number',
    proposed: (batchNo: number, attemptNo: number) => `Proposed: ${batchNo} · attempt ${attemptNo}`,
    reprocess: (batchNo: number, attemptNo: number) =>
      `Proposed: ${batchNo} · attempt ${attemptNo} (the previous attempt of this import was undone)`,
    taken: (batchNo: number) => `Batch ${batchNo} already has an active attempt for this account.`,
    attempt: (attemptNo: number) => `this number would be attempt ${attemptNo}`,
    settlementDate: 'Settlement date',
    settlementDateHelp: 'The business date of the batch; preset fees are those in force on it.',
  },

  preSummary: {
    label: 'Pre-summary',
    title: 'Pre-summary · what will be processed',
    chooseDate: 'Choose the settlement date to see the pre-summary.',
    fixFields: 'Fix the highlighted fields to see the pre-summary.',
    loading: 'Loading the pre-summary…',
    updating: 'Updating the pre-summary…',
    movements: (m: { E: number; I: number; R: number }) => `E ${m.E} · I ${m.I} · R ${m.R}`,
    totals: 'Totals by type',
    columns: { type: 'Type', qty: 'Qty', amount: 'Amount USD', fee: 'Fees USD' },
    payable: 'Amount payable',
    signs: { '+': '+', '-': '−' } as const,
    notProcessed: (skipped: Skipped) => {
      const parts = (Object.keys(SKIPPED) as (keyof Skipped)[])
        .filter((reason) => skipped[reason] > 0)
        .map((reason) => `${skipped[reason]} ${SKIPPED[reason]}`)
      return parts.length > 0 ? `Not processed: ${parts.join(' · ')}` : null
    },
    warnings: 'Warnings',
    loadError: 'The pre-summary could not be loaded.',
  },

  categories: {
    deposit: 'Deposits',
    declined: 'Declined',
    chargeback: 'Chargebacks',
    refund: 'Refunds',
    rdr: 'RDR',
  } satisfies Record<Category, string>,

  /** The texts of the errors that stop the preview or Process, by code. */
  errors: {
    superseded: 'A newer validation run exists. Review it before processing.',
    required: 'There is no current validation run. Review the validations before processing.',
    blocking: 'The validations found a blocking finding. Review them before processing.',
    notValidated: (status: ImportStatus) =>
      `The import is no longer validated (status: ${status}). Review its validations again.`,
    forbidden: 'You cannot process this import.',
    processFailed: 'The batch could not be processed. Try again.',
    toAnalysis: 'Go to the Analysis step',
  },

  process: {
    label: (batchNo: string | number) => `Process batch ${batchNo}`,
    processing: 'Processing the batch…',
    reasons: {
      chooseDate: 'Choose the settlement date.',
      fixFields: 'Fix the highlighted fields.',
      waiting: 'Waiting for the pre-summary.',
      batchTaken: 'Choose a batch number that is not in use.',
      previewFailed: 'The pre-summary is not available.',
    },
  },

  warning: (w: SettlementWarning): string => {
    switch (w.code) {
      case 'undated_adjustment':
        return `Adjustment ${w.transactionId} has no event date: it is processed without one.`
      case 'reserve_already_released':
        return `The reserve of ${w.transactionId} was already released.`
      case 'no_transactional_fees':
        return 'The account has no transaction fees configured.'
      case 'reserve_cap_not_applied':
        return 'The reserve cap of the account is not applied yet.'
      case 'transactional_fees_not_computed':
        return 'Transaction fees are not computed yet.'
      case 'chargeback_reserve_policy_not_applied':
        return 'The reserve release on chargeback of the account is not applied yet.'
      case 'fee_variant_not_applied':
        return `A conditional or per-brand variant of fee ${w.feeId} is not applied.`
      default:
        return (w as { code: string }).code
    }
  },

  review: {
    title: 'Settlement Review',
    loading: 'Loading Settlement Review…',
    loadError: 'Settlement Review could not be loaded.',
    notAvailable: 'This import is not available.',
    backToAnalysis: '← Analysis',
    status: 'Status',
    notValidated: 'This import is not validated. Review its validations before processing.',
    toAnalysis: 'Go to the Analysis step',
    processed: 'This import is already processed.',
    viewSummary: 'View settlement summary',
    cancelled: 'This import is cancelled.',
  },

  summary: {
    title: (batchNo: number) => `Settlement Summary · batch ${batchNo}`,
    loading: 'Loading the settlement…',
    loadError: 'The settlement could not be loaded.',
    notFoundTitle: 'Settlement not found',
    notFoundBody: 'The settlement does not exist or is not in your scope.',
  },

  retry: 'Retry',

  /** The labels of the nine payable lines, by code: the same text the API sends in `label` (design D7). */
  payableLines: {
    deposit: 'Deposits',
    chargeback: 'Chargebacks',
    refund: 'Refunds',
    rdr: 'RDR',
    transactional_fees: 'Transaction fees',
    batch_fees: 'Batch fees',
    reserve_held: 'Reserve held',
    reserve_released: 'Reserve released',
    reserve_early_released: 'Reserve released on chargeback',
  } satisfies Record<PayableLineCode, string>,
}

/** Reasons a row is not processed, in the order of the API. */
const SKIPPED: Record<keyof Skipped, string> = {
  ignored: 'ignored',
  unmatched: 'unmatched',
  ambiguous: 'ambiguous',
  excluded: 'excluded',
  unresolvedStatus: 'with unresolved status',
  pending: 'pending',
}
