import type { ComponentPropsWithoutRef } from 'react'
import { portalRowList, portalRowListItem } from './portalClassNames'

export function PortalRowList({ className = '', ...props }: ComponentPropsWithoutRef<'ul'>) {
  return <ul className={`${portalRowList} m-0 list-none p-0 ${className}`.trim()} {...props} />
}

export function PortalRowListItem({ className = '', ...props }: ComponentPropsWithoutRef<'li'>) {
  return <li className={`${portalRowListItem} ${className}`.trim()} {...props} />
}
