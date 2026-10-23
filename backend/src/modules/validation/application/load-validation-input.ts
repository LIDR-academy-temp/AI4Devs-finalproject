import { computeRanges } from '../domain/ranges.js'
import type { ValidationInput } from '../domain/types.js'
import type { ValidationSources } from './ports.js'

/**
 * Builds the engine input from the read ports in the two steps of the engine (design D2 of validation-engine, D4 of
 * validation-runs): rows and account first, then the ranges say which candidates and reserves to load, and the
 * history is read for every transaction involved (rows ∪ candidates ∪ reserves).
 */
export async function loadValidationInput(
  sources: ValidationSources,
  importId: string,
): Promise<{ input: ValidationInput }> {
  const [rows, account, statuses] = await Promise.all([
    sources.rowsOf(importId),
    sources.accountOf(importId),
    sources.statuses(),
  ])
  const { ranges } = computeRanges(rows, account, statuses)
  const [candidates, reserveCandidates, registeredMissing, hasPreviousBatches] = await Promise.all([
    sources.candidates(account, ranges),
    ranges.R === null ? Promise.resolve([]) : sources.heldReserves(account, ranges.R.max),
    sources.registered(account.providerId),
    sources.hasPreviousBatches(account.providerId, importId),
  ])
  const ids = new Set<bigint>()
  for (const r of rows) if (r.transaction) ids.add(r.transaction.transactionId)
  for (const c of candidates) ids.add(c.transactionId)
  for (const c of reserveCandidates) ids.add(c.transactionId)
  const history = await sources.movements(account.providerId, [...ids], importId)
  return {
    input: {
      account,
      rows,
      history,
      hasPreviousBatches,
      candidates,
      reserveCandidates,
      registeredMissing,
      statuses,
    },
  }
}
