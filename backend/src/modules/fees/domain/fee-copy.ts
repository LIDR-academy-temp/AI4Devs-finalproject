// The fees a new account copies from another account of the same provider (README §1.2 "Creación de cuentas";
// admin-accounts design D3): only the fees active today, each with open validity (NULL…NULL) and a new id, without
// their history.
import type { FeeState } from './fee-patch.js'
import { statusOf } from './fee-validity.js'

export interface FeeCopy {
  sourceFeeId: string
  copy: FeeState
}

/** The copies of the source fees active on `today` (New York day), ordered by fee type and then by source id. */
export function planCopy(sourceFees: readonly FeeState[], today: string, newId: () => string): FeeCopy[] {
  // filter returns a new array: sorting it never reorders the caller's.
  return sourceFees
    .filter((fee) => statusOf(fee, today) === 'active')
    .sort((a, b) => a.feeTypeId - b.feeTypeId || a.feeId.localeCompare(b.feeId))
    .map((fee) => ({ sourceFeeId: fee.feeId, copy: { ...fee, feeId: newId(), startDate: null, endDate: null } }))
}
