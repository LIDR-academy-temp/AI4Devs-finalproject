// The downloads of an attempt (web-settlement design D12). The export routes are #12's: until it is merged the
// buttons are shown disabled with their reason, like SETTLEMENT_REVIEW was before #13. The rebase turns this on.
import type { ExportType, SettlementView } from './contract'

export const SETTLEMENT_EXPORTS_AVAILABLE = false

const EXTENSIONS: Record<string, string> = { 'text/csv': 'csv', 'application/pdf': 'pdf' }

/**
 * The name of the file when the API did not give one (Content-Disposition missing or not exposed by CORS): the
 * attempt and the type, `<account>_B<batchNo>_A<attempt>_<type>.<ext>`, as #12 names them.
 */
export function exportFileName(view: SettlementView, type: ExportType, contentType: string | null): string {
  const extension = EXTENSIONS[contentType?.split(';')[0]?.trim() ?? ''] ?? 'csv'
  return `${view.accountName}_B${view.batchNo}_A${view.attemptNo}_${type}.${extension}`
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
  URL.revokeObjectURL(url)
}
