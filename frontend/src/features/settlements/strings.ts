// Texts of Settlement Review and Settlement Summary (web-shell "Textos de interfaz en inglés y centralizados").
// Those fixed by the spec of web-settlement are literal.
import type { PayableLineCode } from './contract'

export const strings = {
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
