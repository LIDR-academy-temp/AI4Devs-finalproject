import { Link, useParams } from 'react-router-dom'
import { TicketDetallePanel } from '../features/tickets/TicketDetallePanel'
import { PageHeader, PortalPageLayout } from '../shared/components/admin'

export function TrabajadorTicketDetallePage() {
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
    <PortalPageLayout width="3xl" className="space-y-4">
      <Link to="/trabajador/tickets" className="text-sm text-primary hover:underline">
        ← Tickets asignados
      </Link>
      <PageHeader title="Detalle del ticket" />
      <TicketDetallePanel ticketId={id} />
    </PortalPageLayout>
  )
}
