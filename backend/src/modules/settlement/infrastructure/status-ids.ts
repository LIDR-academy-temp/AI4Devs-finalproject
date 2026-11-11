// TransactionStatus ids of the fixed catalog (packages/shared TRANSACTION_STATUSES, seeded 1…6).
import { TRANSACTION_STATUSES, type TransactionStatusCode } from '@recon/shared'

const ids = new Map<TransactionStatusCode, number>(TRANSACTION_STATUSES.map((s) => [s.code, s.statusId]))

export function statusIdOf(code: TransactionStatusCode): number {
  const id = ids.get(code)
  if (id === undefined) throw new Error(`unknown transaction status ${code}`)
  return id
}
