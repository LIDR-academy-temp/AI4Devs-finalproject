import type { ReactNode } from 'react'

export type AdminMobileCardMeta = {
  label: string
  value: string
}

export type AdminMobileCardProps = {
  title: string
  subtitle?: string
  badges?: ReactNode
  meta?: AdminMobileCardMeta[]
  active?: boolean
  onActivate?: () => void
  ariaLabel?: string
}

export function AdminMobileCard({
  title,
  subtitle,
  badges,
  meta,
  active,
  onActivate,
  ariaLabel,
}: AdminMobileCardProps) {
  const interactive = Boolean(onActivate)
  const className = [
    'cq-admin-mobile-card',
    'card',
    'mb-2',
    'shadow-sm',
    active ? 'cq-admin-mobile-card--active' : '',
    interactive ? 'cq-admin-mobile-card--interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const body = (
    <>
      <div className="d-flex align-items-start justify-content-between gap-2">
        <div className="min-w-0 flex-grow-1">
          <div className="fw-semibold text-truncate" title={title}>{title}</div>
          {subtitle ? (
            <div className="small text-muted text-truncate" title={subtitle}>{subtitle}</div>
          ) : null}
        </div>
        {badges ? <div className="flex-shrink-0">{badges}</div> : null}
      </div>
      {meta && meta.length > 0 ? (
        <dl className="cq-admin-mobile-card-meta mb-0 mt-2">
          {meta.map((m) => (
            <div key={m.label} className="cq-admin-mobile-card-meta-row">
              <dt>{m.label}</dt>
              <dd className="mb-0">{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  )

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        onClick={onActivate}
        aria-label={ariaLabel ?? title}
      >
        <div className="card-body py-3">{body}</div>
      </button>
    )
  }

  return (
    <article className={className}>
      <div className="card-body py-3">{body}</div>
    </article>
  )
}
