import { CalendarDays } from 'lucide-react'
import { useJuntas } from '../features/juntas/useJuntas'
import {
  PortalContentListRow,
  PortalListPage,
  PortalListSection,
  PortalRowList,
  portalListCountDescription,
} from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function JuntasPage() {
  const { juntas, loading, error, refetch } = useJuntas()
  useQueryErrorToast(error)

  const count = juntas.length

  return (
    <PortalListPage
      width="3xl"
      header={{
        title: 'Juntas de condóminos',
        description: portalListCountDescription(
          count,
          'junta publicada',
          'juntas publicadas',
          'Convocatorias y acuerdos del fraccionamiento.',
        ),
      }}
      loading={loading}
      error={error}
      onRetry={() => void refetch()}
      empty={
        !loading && !error && count === 0
          ? { title: 'Sin juntas publicadas.', description: 'Las convocatorias aparecerán aquí.' }
          : undefined
      }
    >
      {count > 0 ? (
        <PortalListSection title="Listado">
          <PortalRowList>
            {juntas.map((j) => (
              <PortalContentListRow
                key={j.juntaId}
                icon={CalendarDays}
                title={j.titulo}
                meta={[
                  j.descripcion,
                  j.ubicacion,
                  new Date(j.fechaProgramada).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                to={`/juntas/${j.juntaId}`}
                trailing={
                  <span
                    className={`cq-portal-badge ${
                      j.activa
                        ? 'bg-success-light text-success border border-success/25'
                        : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                    }`}
                  >
                    {j.activa ? 'Activa' : 'Cerrada'}
                  </span>
                }
              />
            ))}
          </PortalRowList>
        </PortalListSection>
      ) : null}
    </PortalListPage>
  )
}
