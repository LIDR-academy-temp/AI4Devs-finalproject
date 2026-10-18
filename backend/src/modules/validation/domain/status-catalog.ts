import type { TransactionStatusCode } from '@recon/shared'
import type { StatusEntry } from './types.js'

export interface StatusCatalog {
  naturalCycle(statusId: number): 'E' | 'I'
  codeOf(statusId: number): TransactionStatusCode
  idOf(code: TransactionStatusCode): number
}

const REQUIRED: readonly TransactionStatusCode[] = ['Pending', 'Successful', 'Declined', 'Chargeback']

/** Lookup over the catalog the engine receives (design D2): an id outside it is a programming error. */
export function createStatusCatalog(statuses: readonly StatusEntry[]): StatusCatalog {
  const byId = new Map(statuses.map((s) => [s.statusId, s]))
  const byCode = new Map(statuses.map((s) => [s.code, s.statusId]))
  for (const code of REQUIRED) {
    if (!byCode.has(code)) throw new Error(`status catalog without ${code}`)
  }
  const entry = (statusId: number): StatusEntry => {
    const found = byId.get(statusId)
    if (!found) throw new Error(`statusId ${statusId} is not in the status catalog`)
    return found
  }
  return {
    naturalCycle: (statusId) => entry(statusId).cycle,
    codeOf: (statusId) => entry(statusId).code,
    idOf: (code) => {
      const id = byCode.get(code)
      if (id === undefined) throw new Error(`status catalog without ${code}`)
      return id
    },
  }
}
