import type { ReactNode } from 'react'
import type { EmptyStateProps } from '../admin/EmptyState'
import { PageHeader, type PageHeaderProps } from '../admin/PageHeader'
import { PortalPageLayout, type PortalPageLayoutProps } from '../PortalPageLayout'
import { PortalBackLink } from './PortalBackLink'
import { PortalEmptySection } from './PortalEmptySection'
import { PortalSection } from './PortalSection'
import { PortalToolbar } from './PortalToolbar'

export type PortalListPageProps = {
  width?: PortalPageLayoutProps['width']
  layoutClassName?: string
  backLink?: { to: string; label: string }
  header: PageHeaderProps
  toolbar?: ReactNode
  loading?: boolean
  loadingMessage?: string
  error?: string | null
  onRetry?: () => void
  empty?: EmptyStateProps
  /** Contenido principal (lista o tabla dentro de `PortalSection` / `PortalRowList`). */
  children?: ReactNode
}

/**
 * Plantilla estándar: card + header bordered + toolbar opcional + estados load/error/empty.
 * Para listas use `PortalSection variant="flushList"` + `PortalRowList` como children.
 */
export function PortalListPage({
  width = '3xl',
  layoutClassName = 'flex flex-col gap-4',
  backLink,
  header,
  toolbar,
  loading = false,
  loadingMessage = 'Cargando…',
  error = null,
  onRetry,
  empty,
  children,
}: PortalListPageProps) {
  const showEmpty = !loading && !error && empty && !children

  return (
    <PortalPageLayout width={width} className={layoutClassName}>
      {backLink ? (
        <PortalBackLink to={backLink.to}>{backLink.label}</PortalBackLink>
      ) : null}
      <PageHeader bordered {...header} />
      {toolbar ? <PortalToolbar>{toolbar}</PortalToolbar> : null}
      {loading ? <p className="text-sm text-neutral">{loadingMessage}</p> : null}
      {error && !loading ? (
        <button
          type="button"
          className="cursor-pointer text-sm text-primary underline"
          onClick={() => onRetry?.()}
        >
          Reintentar
        </button>
      ) : null}
      {showEmpty ? <PortalEmptySection {...empty} /> : null}
      {!loading && !error && children}
    </PortalPageLayout>
  )
}

/** Atajo: sección lista con filas zebra a ancho completo. */
export function PortalListSection({
  title,
  titleId,
  children,
  className,
}: {
  title?: string
  titleId?: string
  children: ReactNode
  className?: string
}) {
  return (
    <PortalSection variant="flushList" title={title} titleId={titleId} className={className}>
      {children}
    </PortalSection>
  )
}

/** Atajo: sección tabla (`PortalDataTable` dentro). */
export function PortalTableSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <PortalSection variant="table" className={className}>
      {children}
    </PortalSection>
  )
}
