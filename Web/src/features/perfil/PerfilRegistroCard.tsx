import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PortalEntityMeta, PortalSection } from '../../shared/components/admin'
import { useQueryErrorToast } from '../../shared/hooks/useQueryErrorToast'

type PerfilRegistroCardProps = {
  sectionId: string
  title: string
  description: string
  to: string
  icon: LucideIcon
  count: number
  loading: boolean
  error: string | null
  previewLines: string[]
  emptyHint: string
  manageLabel: string
}

export function PerfilRegistroCard({
  sectionId,
  title,
  description,
  to,
  icon: Icon,
  count,
  loading,
  error,
  previewLines,
  emptyHint,
  manageLabel,
}: PerfilRegistroCardProps) {
  useQueryErrorToast(error)

  return (
    <PortalSection variant="padded" title={title} titleId={sectionId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PortalEntityMeta>{description}</PortalEntityMeta>
        {!loading && !error && (
          <span className="cq-portal-badge bg-neutral-100 text-neutral-700 border border-neutral-200">
            {count}
          </span>
        )}
      </div>

      <div className="cq-portal-stat-block min-h-[4.5rem]">
        {loading && <p className="cq-portal-stat-block__meta animate-pulse">Cargando…</p>}
        {!loading && error && (
          <p className="cq-portal-stat-block__meta" role="status">
            No se pudo cargar el resumen.
          </p>
        )}
        {!loading && !error && previewLines.length === 0 && (
          <p className="cq-portal-stat-block__meta">{emptyHint}</p>
        )}
        {!loading && !error && previewLines.length > 0 && (
          <ul className="m-0 list-none space-y-1 p-0">
            {previewLines.map((line) => (
              <li key={line} className="truncate text-sm text-neutral-800">
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to={to}
        className="cq-portal-btn cq-portal-btn-primary inline-flex w-full items-center justify-center gap-1 sm:w-auto"
      >
        <Icon className="h-4 w-4" aria-hidden />
        {manageLabel}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </PortalSection>
  )
}
