import { useState } from 'react'
import { FileText } from 'lucide-react'
import { formatArchivoFecha } from '../features/archivos/archivoMappers'
import { useArchivos } from '../features/archivos/useArchivos'
import { useTiposArchivo } from '../features/admin/archivos/useTiposArchivo'
import {
  PortalEntityMain,
  PortalEntityMeta,
  PortalEntityTitle,
  PortalEntityIcon,
  PortalListPage,
  PortalListSection,
  PortalRowActionButton,
  PortalRowList,
  PortalRowListItem,
  PortalToolbar,
  portalListCountDescription,
} from '../shared/components/admin'
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

  const count = archivos.length

  return (
    <PortalListPage
      width="4xl"
      header={{
        title: 'Documentos',
        description: portalListCountDescription(
          count,
          'documento',
          'documentos',
          'Reglamento, actas y archivos oficiales del condominio.',
        ),
      }}
      toolbar={
        <PortalToolbar>
          <label htmlFor="filtro-tipo-archivo">Tipo</label>
          <select
            id="filtro-tipo-archivo"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-surface-alt px-3 py-2 text-sm"
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t.tipoArchivoId} value={t.tipoArchivo}>
                {t.tipoArchivo}
              </option>
            ))}
          </select>
        </PortalToolbar>
      }
      loading={loading}
      loadingMessage="Cargando documentos…"
      error={error}
      onRetry={() => void refetch()}
      empty={
        !loading && !error && count === 0
          ? {
              title: 'No hay documentos disponibles.',
              description: 'Los archivos publicados aparecerán aquí.',
            }
          : undefined
      }
    >
      {count > 0 ? (
        <PortalListSection title="Listado">
          <PortalRowList>
            {archivos.map((a) => (
              <PortalRowListItem
                key={a.archivoId}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <PortalEntityIcon>
                    <FileText className="h-5 w-5" aria-hidden />
                  </PortalEntityIcon>
                  <PortalEntityMain>
                    <PortalEntityTitle>{a.nombre}</PortalEntityTitle>
                    <PortalEntityMeta>
                      {a.tipoArchivo} · {formatArchivoFecha(a.fechaCreacion)}
                    </PortalEntityMeta>
                  </PortalEntityMain>
                </div>
                <PortalRowActionButton onClick={() => void handleDescargar(a.archivoId, a.nombre)}>
                  Descargar
                </PortalRowActionButton>
              </PortalRowListItem>
            ))}
          </PortalRowList>
        </PortalListSection>
      ) : null}
    </PortalListPage>
  )
}
