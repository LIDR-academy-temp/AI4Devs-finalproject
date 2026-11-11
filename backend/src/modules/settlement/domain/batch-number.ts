// Number and attempt of a batch (settlement-process design D7, P13; spec settlement "Intentos de batch" and
// "Siguiente número de batch"): the account's attempts in any status decide both.
import type { AccountAttempt } from './types.js'

const active = (a: AccountAttempt) => a.status !== 'undone'

/** The attempt a number would get, and whether it is free (no active attempt holds it). */
export function attemptFor(
  attempts: readonly AccountAttempt[],
  batchNo: number,
): { attemptNo: number; available: boolean; holder: AccountAttempt | null } {
  const ofNumber = attempts.filter((a) => a.batchNo === batchNo)
  const holder = ofNumber.find(active) ?? null
  const attemptNo = Math.max(0, ...ofNumber.map((a) => a.attemptNo)) + 1
  return { attemptNo, available: holder === null, holder }
}

/**
 * The proposed number: the import's latest undone attempt again, with the next attempt, while no active attempt holds
 * that number (reprocess); otherwise the greatest number of the account in any status + 1, so that an abandoned
 * number is not proposed again.
 */
export function proposeBatchNumber(
  attempts: readonly AccountAttempt[],
  importId: string | null,
): { batchNo: number; attemptNo: number; reason: 'next' | 'reprocess' } {
  const undone = attempts
    .filter((a) => importId !== null && a.importId === importId && !active(a))
    .sort((a, b) => b.attemptNo - a.attemptNo)[0]
  if (undone) {
    const { attemptNo, available } = attemptFor(attempts, undone.batchNo)
    if (available) return { batchNo: undone.batchNo, attemptNo, reason: 'reprocess' }
  }
  const batchNo = Math.max(0, ...attempts.map((a) => a.batchNo)) + 1
  return { batchNo, attemptNo: attemptFor(attempts, batchNo).attemptNo, reason: 'next' }
}
