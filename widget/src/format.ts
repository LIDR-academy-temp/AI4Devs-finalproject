import type { SignatureRequestStatus } from './api'

const KB = 1024
const MB = 1024 * KB

const decimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

export function formatSize(bytes: number): string {
  if (bytes < KB) return `${bytes} B`
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`
  return `${decimal.format(bytes / MB)} MB`
}

export function formatPages(pages: number): string {
  return pages === 1 ? '1 página' : `${pages} páginas`
}

const STATUS_LABELS: Record<SignatureRequestStatus, string> = {
  pending: 'Pendiente de firma',
  signing: 'Firmando',
  signed: 'Firmado',
  failed: 'Firma fallida',
}

export function statusLabel(status: SignatureRequestStatus): string {
  return STATUS_LABELS[status]
}
