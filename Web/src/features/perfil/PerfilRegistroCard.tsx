import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
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
    <section
      className="flex flex-col rounded-xl border border-neutral-200 bg-surface-alt p-4 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.06]"
      aria-labelledby={sectionId}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={sectionId} className="text-base font-semibold text-neutral-900">
              {title}
            </h2>
            {!loading && !error && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-neutral-700">
                {count}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-neutral">{description}</p>
        </div>
      </div>

      <div className="mt-4 min-h-[4.5rem] rounded-lg bg-surface/80 px-3 py-2.5">
        {loading && <p className="text-sm text-neutral animate-pulse">Cargando…</p>}
        {!loading && error && (
          <p className="text-sm text-neutral" role="status">No se pudo cargar el resumen.</p>
        )}
        {!loading && !error && previewLines.length === 0 && (
          <p className="text-sm text-neutral">{emptyHint}</p>
        )}
        {!loading && !error && previewLines.length > 0 && (
          <ul className="space-y-1 text-sm text-neutral-700">
            {previewLines.map((line) => (
              <li key={line} className="truncate">{line}</li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to={to}
        className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        {manageLabel}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  )
}
