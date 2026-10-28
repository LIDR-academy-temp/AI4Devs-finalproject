import { Link, useParams } from 'react-router-dom'
import { useJuntaDetalle } from '../features/juntas/useJuntaDetalle'
import { AlertBanner, EmptyState, PageHeader } from '../shared/components/admin'

export function JuntaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { junta, loading, error } = useJuntaDetalle(Number(id))

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="animate-pulse space-y-4" aria-label="Cargando junta">
          <div className="h-8 w-2/3 rounded bg-neutral-100" />
          <div className="h-4 w-1/2 rounded bg-neutral-100" />
          <div className="h-40 rounded bg-neutral-100" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <AlertBanner variant="error">{error}</AlertBanner>
      </main>
    )
  }

  if (!junta) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <EmptyState title="Junta no encontrada." />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <Link to="/juntas" className="text-sm text-primary hover:underline">← Juntas</Link>
      <div className="rounded-xl border border-neutral-100 bg-white p-6 shadow-sm">
        <PageHeader
          title={junta.titulo}
          actions={
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                junta.activa ? 'bg-success-light text-success' : 'bg-surface-alt text-neutral'
              }`}
            >
              {junta.activa ? 'Activa' : 'Cerrada'}
            </span>
          }
        />

        <div className="mb-6 space-y-1 text-sm text-neutral">
          <p>
            {new Date(junta.fechaProgramada).toLocaleString('es-MX', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
          {junta.ubicacion && <p>{junta.ubicacion}</p>}
        </div>

        {junta.descripcion && (
          <p className="mb-6 whitespace-pre-wrap text-neutral-700">{junta.descripcion}</p>
        )}

        {junta.contenido ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-700">Acuerdos / Acta</h2>
            <div className="whitespace-pre-wrap rounded-lg bg-surface p-4 text-sm text-neutral-700">
              {junta.contenido}
            </div>
          </section>
        ) : (
          <p className="text-sm italic text-neutral-300">El acta aún no ha sido publicada.</p>
        )}

        {junta.archivos.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-neutral-700">Archivos adjuntos</h2>
            <ul className="space-y-2">
              {junta.archivos.map((a) => (
                <li key={a.juntaDetalleArchivoId} className="flex items-center gap-2 text-sm text-neutral-700">
                  <span>{a.nombreArchivo}</span>
                  {a.tipoArchivo && <span className="text-xs text-neutral-300">({a.tipoArchivo})</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
