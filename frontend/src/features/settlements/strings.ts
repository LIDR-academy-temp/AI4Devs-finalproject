// Texts of Settlement Review and Settlement Summary (web-shell "Textos de interfaz en inglés y centralizados").
// Those fixed by the spec of web-settlement are literal.
import type { PayableLineCode } from './contract'

export const strings = {
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
