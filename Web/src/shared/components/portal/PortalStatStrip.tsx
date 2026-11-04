import type { ReactNode } from 'react'

export type PortalStatProps = {
  label: string
  value: ReactNode
  valueClassName?: string
}

export function PortalStat({ label, value, valueClassName = '' }: PortalStatProps) {
  return (
    <div className="cq-portal-stat">
      <p className="cq-portal-stat-label">{label}</p>
      <p className={`cq-portal-stat-value ${valueClassName}`.trim()}>{value}</p>
    </div>
  )
}

export type PortalStatStripProps = {
  children: ReactNode
  className?: string
}

export function PortalStatStrip({ children, className = '' }: PortalStatStripProps) {
  return <div className={`cq-portal-stat-strip ${className}`.trim()}>{children}</div>
}
