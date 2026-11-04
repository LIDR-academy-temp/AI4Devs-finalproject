import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useEncuestasActivas } from '../features/encuestas/useEncuestasActivas'
import { puedeVerResultadosEncuesta } from '../features/encuestas/encuestaResultadosVisibility'
import {
  PortalEntityMain,
  PortalEntityMeta,
  PortalEntityTitle,
  PortalEntityIcon,
  PortalListPage,
  PortalListSection,
  PortalRowList,
  PortalRowListItem,
  portalListCountDescription,
} from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function EncuestasPage() {
  const { encuestas, loading, error, refetch } = useEncuestasActivas()
  useQueryErrorToast(error)

  const count = encuestas.length

  return (
    <PortalListPage
      width="3xl"
      header={{
        title: 'Encuestas activas',
        description: portalListCountDescription(
          count,
          'encuesta abierta',
          'encuestas abiertas',
          'Participa en las encuestas del fraccionamiento.',
        ),
      }}
      loading={loading}
      loadingMessage="Cargando encuestas…"
      error={error}
      onRetry={() => void refetch()}
      empty={
        !loading && !error && count === 0
          ? {
              title: 'No hay encuestas activas en este momento.',
              description: 'Te avisaremos cuando haya una nueva.',
            }
          : undefined
      }
    >
      {count > 0 ? (
        <PortalListSection title="Listado">
          <PortalRowList>
            {encuestas.map((e) => (
              <PortalRowListItem key={e.encuestaId}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <PortalEntityIcon>
                      <ClipboardList className="h-5 w-5" aria-hidden />
                    </PortalEntityIcon>
                    <PortalEntityMain>
                      <PortalEntityTitle>{e.titulo}</PortalEntityTitle>
                      {e.descripcion ? <PortalEntityMeta>{e.descripcion}</PortalEntityMeta> : null}
                      <PortalEntityMeta>
                        Disponible hasta:{' '}
                        {e.fechaFin ? new Date(e.fechaFin).toLocaleDateString('es-MX') : 'Sin fecha límite'}
                      </PortalEntityMeta>
                    </PortalEntityMain>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                    {e.yaParticipo ? (
                      <span className="cq-portal-badge bg-neutral-100 text-neutral-700 border border-neutral-200">
                        Ya respondiste
                      </span>
                    ) : e.encuestaId > 0 ? (
                      <Link to={`/encuestas/${e.encuestaId}`} className="cq-portal-btn-primary text-center !text-sm">
                        Responder
                      </Link>
                    ) : (
                      <span className="text-xs text-neutral">No disponible</span>
                    )}
                    {e.encuestaId > 0 && puedeVerResultadosEncuesta(e) && (
                      <Link
                        to={`/encuestas/${e.encuestaId}/resultados`}
                        className="text-center text-sm font-medium text-primary hover:underline"
                      >
                        Ver resultados
                      </Link>
                    )}
                  </div>
                </div>
              </PortalRowListItem>
            ))}
          </PortalRowList>
        </PortalListSection>
      ) : null}
    </PortalListPage>
  )
}
