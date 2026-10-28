import { Link } from 'react-router-dom'
import { useJuntas } from '../features/juntas/useJuntas'
import { EmptyState, PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function JuntasPage() {
  const { juntas, loading, error, refetch } = useJuntas()
  useQueryErrorToast(error)

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <PageHeader title="Juntas de condóminos" description="Convocatorias y acuerdos publicados." />
      {loading && (
        <div className="space-y-4 animate-pulse" aria-label="Cargando juntas">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-neutral-100 rounded-lg" />
          ))}
        </div>
      )}
      {error && (
        <button
          type="button"
          className="cursor-pointer text-sm text-primary underline"
          onClick={() => void refetch()}
        >
          Reintentar
        </button>
      )}
      {!loading && !error && juntas.length === 0 && (
        <EmptyState title="Sin juntas publicadas." />
      )}
      {!loading && !error && juntas.length > 0 && (
        <ul className="space-y-4">
          {juntas.map((j) => (
            <li key={j.juntaId}>
              <Link
                to={`/juntas/${j.juntaId}`}
                className="block rounded-xl border border-neutral-100 bg-surface-alt p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">{j.titulo}</p>
                    {j.descripcion && (
                      <p className="text-sm text-neutral mt-1 line-clamp-2">{j.descripcion}</p>
                    )}
                    {j.ubicacion && <p className="text-xs text-neutral-300 mt-1">{j.ubicacion}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-primary-dark">
                      {new Date(j.fechaProgramada).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                        j.activa ? 'bg-success-light text-success' : 'bg-surface-alt text-neutral'
                      }`}
                    >
                      {j.activa ? 'Activa' : 'Cerrada'}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
