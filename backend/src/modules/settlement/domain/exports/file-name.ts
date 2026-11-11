// File name of an export, by attempt (design D8): ASCII from a whitelist, so Content-Disposition needs no filename*.
import type { ExportType } from '@recon/shared'

const FALLBACK = 'account'

/** The account name with every run outside [A-Za-z0-9-] as one underscore, trimmed of _ and - at both ends. */
export function safeAccountName(name: string): string {
  const safe = name.replace(/[^A-Za-z0-9-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '')
  return safe === '' ? FALLBACK : safe
}

/** <account>_B<batchNo>_A<attemptNo>_<type>.csv */
export function exportFileName(accountName: string, batchNo: number, attemptNo: number, type: ExportType): string {
  return `${safeAccountName(accountName)}_B${batchNo}_A${attemptNo}_${type}.csv`
}
