// The downloads of an attempt (web-settlement design D12). The export routes are #12's: until it was merged the
// buttons were shown disabled with their reason, like SETTLEMENT_REVIEW was before #13.
import type { ExportType, SettlementView } from './contract'

export const SETTLEMENT_EXPORTS_AVAILABLE = true

/** The Back-Office CSVs: Excel would rewrite their text IDs as numbers, so the screen warns next to them. */
export const BACK_OFFICE_EXPORTS: readonly ExportType[] = ['transactions', 'reserves']

/**
 * The name of the file when the API did not give one (Content-Disposition missing or not exposed by CORS): the
 * attempt and the type, `<account>_B<batchNo>_A<attempt>_<type>.csv`, as #12 names them (the three are CSV).
 */
export function exportFileName(view: SettlementView, type: ExportType): string {
  return `${view.accountName}_B${view.batchNo}_A${view.attemptNo}_${type}.csv`
}

/** Saves a downloaded file through a temporary link: the browser's download, nothing kept in the page. */
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers read the object URL after click() returns: release it on the next task.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
