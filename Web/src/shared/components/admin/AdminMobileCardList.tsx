import type { ReactNode } from 'react'

export type AdminMobileCardListProps<T> = {
  rows: T[]
  getRowKey: (row: T) => string | number
  renderCard: (row: T) => ReactNode
  emptyMessage?: string
  className?: string
}

export function AdminMobileCardList<T>({
  rows,
  getRowKey,
  renderCard,
  emptyMessage = 'Sin resultados para los filtros aplicados.',
  className = 'cq-admin-mobile-list d-md-none',
}: AdminMobileCardListProps<T>) {
  if (rows.length === 0) {
    return (
      <p className={`${className} text-center text-muted py-4 mb-0`} role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className={className}>
      {rows.map((row) => (
        <div key={getRowKey(row)}>{renderCard(row)}</div>
      ))}
    </div>
  )
}
