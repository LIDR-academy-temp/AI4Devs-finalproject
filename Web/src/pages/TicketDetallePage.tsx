import { Link, useParams } from 'react-router-dom'
import { TicketDetallePanel } from '../features/tickets/TicketDetallePanel'
import { PortalBackLink, PortalPageLayout, PortalSection } from '../shared/components/admin'

export function TicketDetallePage() {
  const { ticketId } = useParams()
  const id = Number(ticketId)

  if (!Number.isFinite(id)) {
    return (
      <PortalPageLayout width="3xl">
        <p className="text-danger" role="alert">
          Identificador inválido.
        </p>
      </PortalPageLayout>
    )
  }

  return (
    <PortalPageLayout width="3xl" className="flex flex-col gap-4">
      <PortalBackLink to="/tickets">← Mis tickets</PortalBackLink>
      <header className="cq-portal-page-header">
        <h1 className="text-2xl font-semibold text-primary-dark">Detalle del ticket</h1>
      </header>
      <PortalSection variant="padded">
        <TicketDetallePanel ticketId={id} />
      </PortalSection>
      <div className="flex flex-wrap gap-2">
        <Link to="/tickets/nuevo" className="cq-portal-btn-primary">
          + Nuevo ticket
        </Link>
        <Link to="/tickets" className="cq-portal-btn">
          Volver al listado
        </Link>
      </div>
    </PortalPageLayout>
  )
}
