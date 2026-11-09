import type { ElementType, ReactNode } from 'react'
import { portalSectionClass, portalSectionTitle, type PortalSectionVariant } from './portalClassNames'

export type PortalSectionProps = {
  children: ReactNode
  /** `flushList` / `table` = filas a ancho completo con zebra; `padded` = formularios y empty states */
  variant?: PortalSectionVariant
  title?: string
  titleId?: string
  className?: string
  as?: ElementType
}

export function PortalSection({
  children,
  variant = 'padded',
  title,
  titleId,
  className = '',
  as: Tag = 'section',
}: PortalSectionProps) {
  return (
    <Tag className={portalSectionClass(variant, className)}>
      {title ? (
        <h2 id={titleId} className={`${portalSectionTitle} cq-portal-section--padded-title`}>
          {title}
        </h2>
      ) : null}
      {children}
    </Tag>
  )
}
