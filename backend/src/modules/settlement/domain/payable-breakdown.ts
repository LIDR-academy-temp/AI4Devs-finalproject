// The amount payable as nine signed lines (gate decision P3, settlement-process design D15): the server computes
// amountPayable as their sum, so the preview, the response, #12 and #13 show the same lines and they always add up.
import type { PayableLine, PayableLineCode } from '@recon/shared'
import { Decimal } from './money.js'

export interface PayableParts {
  deposit: string
  chargeback: string
  refund: string
  rdr: string
  transactionalFees: string
  batchFees: string
  reserveHeld: string
  reserveReleased: string
  reserveEarlyReleased: string
}

const LINES: readonly { code: PayableLineCode; label: string; sign: '+' | '-'; part: keyof PayableParts }[] = [
  { code: 'deposit', label: 'Deposits', sign: '+', part: 'deposit' },
  { code: 'chargeback', label: 'Chargebacks', sign: '-', part: 'chargeback' },
  { code: 'refund', label: 'Refunds', sign: '-', part: 'refund' },
  { code: 'rdr', label: 'RDR', sign: '-', part: 'rdr' },
  { code: 'transactional_fees', label: 'Transaction fees', sign: '-', part: 'transactionalFees' },
  { code: 'batch_fees', label: 'Batch fees', sign: '-', part: 'batchFees' },
  { code: 'reserve_held', label: 'Reserve held', sign: '-', part: 'reserveHeld' },
  { code: 'reserve_released', label: 'Reserve released', sign: '+', part: 'reserveReleased' },
  { code: 'reserve_early_released', label: 'Reserve released on chargeback', sign: '+', part: 'reserveEarlyReleased' },
]

export function payableBreakdown(parts: PayableParts): { lines: PayableLine[]; amountPayable: string } {
  const lines = LINES.map(({ code, label, sign, part }) => ({ code, label, sign, amount: parts[part] }))
  const amountPayable = lines.reduce(
    (total, line) => (line.sign === '+' ? total.plus(line.amount) : total.minus(line.amount)),
    new Decimal(0),
  )
  return { lines, amountPayable: amountPayable.toFixed(4) }
}
