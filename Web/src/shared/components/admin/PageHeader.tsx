import type { ReactNode } from 'react'

export type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  /** Borde inferior tipo panel admin (portal) */
  bordered?: boolean
}

export function PageHeader({ title, description, actions, bordered = false }: PageHeaderProps) {
  return (
    <header
      className={`flex min-w-0 flex-wrap items-start justify-between gap-3${bordered ? ' cq-portal-page-header' : ''}`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-primary-dark">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
