import type { ReactNode } from 'react'
import { portalToolbar } from './portalClassNames'

export type PortalToolbarProps = {
  children: ReactNode
  className?: string
}

export function PortalToolbar({ children, className = '' }: PortalToolbarProps) {
  return <div className={`${portalToolbar} ${className}`.trim()}>{children}</div>
}
