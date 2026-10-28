import { Link } from 'react-router-dom'
import { useAnunciosResidente } from '../features/anuncios/useAnuncios'
import { AlertBanner, EmptyState, PageHeader } from '../shared/components/admin'

export function AnunciosPage() {
  const { data, loading, error } = useAnunciosResidente()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 md:px-8">
      <PageHeader title="Comunicados" description="Avisos y noticias del condominio." />
      {loading && <p className="text-neutral">Cargando…</p>}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {!loading && !error && data.length === 0 && (
        <EmptyState title="No hay comunicados vigentes." />
      )}
      {!loading && !error && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((a) => (
            <li key={a.anuncioId}>
              <Link
                to={`/anuncios/${a.anuncioId}`}
                className="block rounded border p-3 hover:bg-surface"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium text-neutral-900">{a.titulo}</span>
                  {!a.visto && (
                    <span className="shrink-0 rounded bg-primary-100 px-2 py-0.5 text-xs text-primary-dark">Nuevo</span>
                  )}
                </div>
                <p className="text-sm text-neutral">
                  {a.tipoAnuncio} · {new Date(a.fechaPublicacion).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
