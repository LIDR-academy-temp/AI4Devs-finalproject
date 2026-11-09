import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { portalBackLink } from './portalClassNames'

export type PortalBackLinkProps = LinkProps & {
  children: ReactNode
}

export function PortalBackLink({ className = '', children, ...props }: PortalBackLinkProps) {
  return (
    <Link className={`${portalBackLink} ${className}`.trim()} {...props}>
      {children}
    </Link>
  )
}
