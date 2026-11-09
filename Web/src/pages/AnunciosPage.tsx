import { Megaphone } from 'lucide-react'
import { useAnunciosResidente } from '../features/anuncios/useAnuncios'
import {
  PortalContentListRow,
  PortalListPage,
  PortalListSection,
  PortalRowList,
  portalListCountDescription,
} from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function AnunciosPage() {
  const { data, loading, error, refetch } = useAnunciosResidente()
  useQueryErrorToast(error)

  const count = data.length

  return (
    <PortalListPage
      width="3xl"
      header={{
        title: 'Comunicados',
        description: portalListCountDescription(
          count,
          'comunicado',
          'comunicados',
          'Avisos y noticias del condominio.',
        ),
      }}
      loading={loading}
      error={error}
      onRetry={() => void refetch()}
      empty={
        !loading && !error && count === 0
          ? {
              title: 'No hay comunicados vigentes.',
              description: 'Cuando publiquen un aviso, aparecerá aquí.',
            }
          : undefined
      }
    >
      {count > 0 ? (
        <PortalListSection title="Listado">
          <PortalRowList>
            {data.map((a) => (
              <PortalContentListRow
                key={a.anuncioId}
                icon={Megaphone}
                title={a.titulo}
                meta={`${a.tipoAnuncio} · ${new Date(a.fechaPublicacion).toLocaleDateString('es-MX')}`}
                to={`/anuncios/${a.anuncioId}`}
                trailing={
                  !a.visto ? (
                    <span className="cq-portal-badge bg-primary-light text-primary-dark border border-primary/25">
                      Nuevo
                    </span>
                  ) : null
                }
              />
            ))}
          </PortalRowList>
        </PortalListSection>
      ) : null}
    </PortalListPage>
  )
}
