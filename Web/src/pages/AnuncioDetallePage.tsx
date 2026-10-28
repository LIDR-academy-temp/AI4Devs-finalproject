import { Link, useParams } from 'react-router-dom'
import { useAnuncioDetalle } from '../features/anuncios/useAnuncios'
import { PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function AnuncioDetallePage() {
  const { id } = useParams()
  const anuncioId = Number(id)
  const { item, loading, error } = useAnuncioDetalle(anuncioId)
  useQueryErrorToast(error)

  if (!Number.isFinite(anuncioId)) {
    return (
      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <p className="text-danger" role="alert">Identificador inválido.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <Link to="/anuncios" className="text-sm text-primary hover:underline">← Volver</Link>
      {loading && <p className="text-neutral">Cargando…</p>}
      {error && !loading && (
        <p className="text-sm text-neutral">No se pudo mostrar el anuncio. Revisa la notificación o vuelve al listado.</p>
      )}
      {item && (
        <article>
          <PageHeader
            title={item.titulo}
            description={`${item.tipoAnuncio} · ${new Date(item.fechaPublicacion).toLocaleString()}`}
          />
          <div className="mt-6 whitespace-pre-wrap text-neutral-700">{item.contenido}</div>
        </article>
      )}
    </main>
  )
}
