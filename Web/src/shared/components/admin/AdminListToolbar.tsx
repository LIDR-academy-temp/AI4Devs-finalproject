import type { ReactNode } from 'react'

export type AdminListMetric = {
  label: string
  value: number | string
}

export type AdminListToolbarProps = {
  title: string
  metrics?: AdminListMetric[]
  filterSlot?: ReactNode
  primaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
    iconClass?: string
  }
}

/** Barra única: título + KPIs compactos + filtros API + CTA. Sin hero ni subtítulo duplicado. */
export function AdminListToolbar({
  title,
  metrics = [],
  filterSlot,
  primaryAction,
}: AdminListToolbarProps) {
  return (
    <div className="card cq-list-toolbar mb-3">
      <div className="card-body py-3">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div className="min-width-0">
            <h1 className="h4 mb-2 mb-lg-1">{title}</h1>
            {metrics.length > 0 && (
              <ul className="cq-list-metrics list-unstyled mb-0" aria-label="Resumen">
                {metrics.map((m) => (
                  <li key={m.label}>
                    <span className="cq-list-metric-value">{m.value}</span>
                    <span className="cq-list-metric-label">{m.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 cq-list-toolbar-actions">
            {filterSlot}
            {primaryAction && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
              >
                {primaryAction.iconClass && <i className={primaryAction.iconClass} aria-hidden="true" />}
                <span className={primaryAction.iconClass ? 'ms-1' : undefined}>{primaryAction.label}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
