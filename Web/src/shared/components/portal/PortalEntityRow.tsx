import type React from 'react'
import type { ReactNode } from 'react'
export function PortalEntityIcon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`cq-portal-entity-icon ${className}`.trim()}
      aria-hidden={typeof children === 'string'}
    >
      {children}
    </span>
  )
}

export function PortalEntityMain({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`cq-portal-entity-main min-w-0 flex-1 ${className}`.trim()}>{children}</div>
}

export function PortalEntityTitle({ children }: { children: ReactNode }) {
  return <p className="cq-portal-entity-title">{children}</p>
}

export function PortalEntityMeta({ children }: { children: ReactNode }) {
  return <p className="cq-portal-entity-meta">{children}</p>
}

export function PortalRowActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`cq-portal-row-actions flex shrink-0 flex-wrap items-center gap-2 ${className}`.trim()}>
      {children}
    </div>
  )
}

export function PortalRowActionButton({
  children,
  variant = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'danger' }) {
  const variantClass = variant === 'danger' ? 'cq-portal-row-action--danger' : 'cq-portal-row-action'
  return (
    <button type="button" className={variantClass} {...props}>
      {children}
    </button>
  )
}
