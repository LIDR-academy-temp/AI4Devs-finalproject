import type { ReactNode } from 'react'

export type AdminSidePanelProps = {
  visible: boolean
  title: string
  subtitle: string
  iconClass: string
  editing?: boolean
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  titleId?: string
}

export function AdminSidePanel({
  visible,
  title,
  subtitle,
  iconClass,
  editing = false,
  onClose,
  children,
  footer,
  titleId = 'cq-side-panel-title',
}: AdminSidePanelProps) {
  if (!visible) {
    return null
  }

  return (
    <div className={`card h-100${editing ? ' cq-card-editing' : ''}`}>
      <div className="cq-panel-header">
        <div className="cq-panel-icon" aria-hidden="true">
          <i className={iconClass} />
        </div>
        <div className="flex-grow-1 min-width-0">
          <h5 id={titleId} className="mb-0">{title}</h5>
          <small className="text-muted">{subtitle}</small>
        </div>
        <button type="button" className="cq-close-btn" onClick={onClose} aria-label="Cerrar panel">
          <i className="mdi mdi-close" />
        </button>
      </div>
      <div className="card-body pt-3" role="region" aria-labelledby={titleId}>
        {children}
        <div className="cq-form-actions">{footer}</div>
      </div>
    </div>
  )
}
