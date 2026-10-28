import { useState } from 'react'
import { formatArchivoFecha } from '../features/archivos/archivoMappers'
import { useArchivos } from '../features/archivos/useArchivos'
import { useTiposArchivo } from '../features/admin/archivos/useTiposArchivo'
import { EmptyState, PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { downloadAuthenticated } from '../shared/lib/downloadAuthenticated'

export function ArchivosPage() {
  const { tipos } = useTiposArchivo()
  const [filtro, setFiltro] = useState('')
  const { archivos, loading, error, refetch } = useArchivos(filtro || undefined)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  useQueryErrorToast(error)
  useQueryErrorToast(downloadError)

  async function handleDescargar(archivoId: number, nombre: string) {
    setDownloadError(null)
    const result = await downloadAuthenticated(`/ARC/Archivos/${archivoId}/descargar`)
    if (!result.ok) {
      setDownloadError(result.problem?.detail ?? 'Error en descarga')
      return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(result.blob)
    a.download = nombre
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <PageHeader
        title="Documentos"
        description="Reglamento, actas y archivos oficiales del condominio."
      />

      <div>
        <label className="sr-only" htmlFor="filtro-tipo-archivo">Tipo de archivo</label>
        <select
          id="filtro-tipo-archivo"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded border border-neutral-200 bg-surface-alt px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t.tipoArchivoId} value={t.tipoArchivo}>
              {t.tipoArchivo}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-neutral" aria-live="polite">Cargando documentos…</p>
      )}

      {!loading && error && (
        <button
          type="button"
          className="cursor-pointer text-sm text-primary underline"
          onClick={() => void refetch()}
        >
          Reintentar
        </button>
      )}

      {!loading && !error && archivos.length === 0 && (
        <EmptyState title="No hay documentos disponibles." />
      )}

      {!loading && !error && archivos.length > 0 && (
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-100 bg-surface-alt">
          {archivos.map((a) => (
            <li key={a.archivoId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-900">{a.nombre}</p>
                <p className="text-xs text-neutral">
                  {a.tipoArchivo} · {formatArchivoFecha(a.fechaCreacion)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDescargar(a.archivoId, a.nombre)}
                className="cursor-pointer shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Descargar
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
