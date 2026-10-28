import { Link } from 'react-router-dom'
import { useEncuestasActivas } from '../features/encuestas/useEncuestasActivas'
import { AlertBanner, EmptyState, PageHeader } from '../shared/components/admin'

export function EncuestasPage() {
  const { encuestas, loading, error } = useEncuestasActivas()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8">
      <PageHeader title="Encuestas activas" description="Participa en las encuestas del fraccionamiento." />
      {loading && <p className="text-neutral">Cargando encuestas…</p>}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {!loading && !error && encuestas.length === 0 && (
        <EmptyState title="No hay encuestas activas en este momento." />
      )}
      {!loading && !error && encuestas.length > 0 && (
        <ul className="flex flex-col gap-3">
          {encuestas.map((e) => (
            <li key={e.encuestaId} className="rounded border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-700">{e.titulo}</p>
                  {e.descripcion && <p className="mt-1 text-sm text-neutral">{e.descripcion}</p>}
                  <p className="mt-1 text-xs text-neutral-300">
                    Disponible hasta:{' '}
                    {e.fechaFin ? new Date(e.fechaFin).toLocaleDateString('es-MX') : 'Sin fecha límite'}
                  </p>
                </div>
                {e.yaParticipo ? (
                  <span className="shrink-0 rounded bg-surface-alt px-2 py-1 text-xs text-neutral">
                    Ya respondiste
                  </span>
                ) : (
                  <Link
                    to={`/encuestas/${e.encuestaId}`}
                    className="shrink-0 cursor-pointer rounded bg-primary px-3 py-1 text-sm text-white hover:bg-primary-dark"
                  >
                    Responder
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
