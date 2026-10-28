import { Link, useParams } from 'react-router-dom'
import { TicketDetallePanel } from '../features/tickets/TicketDetallePanel'
import { PageHeader } from '../shared/components/admin'

export function TicketDetallePage() {
  const { ticketId } = useParams()
  const id = Number(ticketId)

  if (!Number.isFinite(id)) {
    return (
      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <p className="text-danger" role="alert">Identificador inválido.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <Link to="/tickets" className="text-sm text-primary hover:underline">
        ← Mis tickets
      </Link>
      <PageHeader title="Detalle del ticket" />
      <TicketDetallePanel ticketId={id} />
      <Link
        to="/tickets/nuevo"
        className="inline-block text-sm text-primary-600 hover:underline"
      >
        Nuevo ticket
      </Link>
    </main>
  )
}
