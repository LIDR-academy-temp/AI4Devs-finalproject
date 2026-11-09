import { TicketForm } from '../features/tickets/TicketForm'
import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { PortalBackLink, PortalPageLayout, PortalSection } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function NuevoTicketPage() {
  const { categorias, prioridades, loading, error } = useCatalogosTicket()
  useQueryErrorToast(error)

  return (
    <PortalPageLayout width="3xl" className="flex flex-col gap-4">
      <PortalBackLink to="/tickets">← Mis tickets</PortalBackLink>
      <header className="cq-portal-page-header">
        <h1 className="text-2xl font-semibold text-primary-dark">Nuevo ticket</h1>
        <p className="mt-1 text-sm text-neutral">Describe la incidencia con el mayor detalle posible.</p>
      </header>
      {loading && <p className="text-sm text-neutral">Cargando catálogos…</p>}
      {error && (
        <p className="text-sm text-neutral" role="status">
          No se puede crear el ticket hasta que carguen los catálogos.
        </p>
      )}
      {!loading && !error && (
        <PortalSection variant="padded" title="Datos de la incidencia">
          <TicketForm categorias={categorias} prioridades={prioridades} />
        </PortalSection>
      )}
    </PortalPageLayout>
  )
}
