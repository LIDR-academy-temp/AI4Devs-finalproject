import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  PortalEntityIcon,
  PortalEntityMain,
  PortalEntityMeta,
  PortalEntityTitle,
} from './PortalEntityRow'
import { PortalRowListItem } from './PortalRowList'

export type PortalContentListRowProps = {
  icon: LucideIcon
  title: string
  meta?: ReactNode
  trailing?: ReactNode
  to?: string
  className?: string
}

/** Fila estándar del portal: icono + título/meta + acciones + chevron (si hay enlace). */
export function PortalContentListRow({
  icon: Icon,
  title,
  meta,
  trailing,
  to,
  className = '',
}: PortalContentListRowProps) {
  const body = (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <PortalEntityIcon>
          <Icon className="h-5 w-5" aria-hidden />
        </PortalEntityIcon>
        <PortalEntityMain>
          <PortalEntityTitle>{title}</PortalEntityTitle>
          {meta != null && meta !== '' ? <PortalEntityMeta>{meta}</PortalEntityMeta> : null}
        </PortalEntityMain>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-start sm:self-center">
        {trailing}
        {to ? <ChevronRight className="cq-portal-ticket-row-chevron h-4 w-4" aria-hidden /> : null}
      </div>
    </>
  )

  const layout = `flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className}`.trim()

  if (to) {
    return (
      <PortalRowListItem>
        <Link to={to} className={`cq-portal-link-row ${layout}`}>
          {body}
        </Link>
      </PortalRowListItem>
    )
  }

  return <PortalRowListItem className={layout}>{body}</PortalRowListItem>
}

export function portalListCountDescription(count: number, singular: string, plural: string, emptyHint: string) {
  if (count === 0) return emptyHint
  return `${count} ${count === 1 ? singular : plural}`
}
