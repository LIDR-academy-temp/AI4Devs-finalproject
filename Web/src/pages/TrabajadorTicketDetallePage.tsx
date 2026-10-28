import { Link, useParams } from 'react-router-dom'
import { TicketDetallePanel } from '../features/tickets/TicketDetallePanel'
import { PageHeader } from '../shared/components/admin'

export function TrabajadorTicketDetallePage() {
  const { ticketId } = useParams()
  const id = Number(ticketId)

  if (!Number.isFinite(id)) {
    return (
      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <p className="text-danger" role="alert">
          Identificador inválido.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <Link to="/trabajador/tickets" className="text-sm text-primary hover:underline">
        ← Tickets asignados
      </Link>
      <PageHeader title="Detalle del ticket" />
      <TicketDetallePanel ticketId={id} />
    </main>
  )
}
