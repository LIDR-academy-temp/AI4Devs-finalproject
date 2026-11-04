/** Clases CSS del portal — usar vía componentes `portal/*` cuando sea posible. */

export const portalSectionBase = 'cq-portal-section'

export const portalSectionVariant = {
  padded: 'cq-portal-section--padded',
  flushList: 'cq-portal-section--flush-list',
  table: 'cq-portal-section--table',
} as const

export type PortalSectionVariant = keyof typeof portalSectionVariant

export function portalSectionClass(variant: PortalSectionVariant = 'padded', extra = '') {
  return [portalSectionBase, portalSectionVariant[variant], extra].filter(Boolean).join(' ')
}

export const portalRowList = 'cq-portal-row-list'
export const portalRowListItem = 'cq-portal-row-list__item'
export const portalDataTable = 'cq-portal-data-table'
export const portalDataTableWrap = 'cq-portal-data-table-wrap'
export const portalToolbar = 'cq-portal-toolbar'
export const portalBackLink = 'cq-portal-back-link'
export const portalSectionTitle = 'cq-portal-section-title'
export const portalNotifList = 'cq-portal-notif-list'
