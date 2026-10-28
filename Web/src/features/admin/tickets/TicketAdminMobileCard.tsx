import { EstadoTicketBadge } from '../../tickets/EstadoTicketBadge'
import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { AdminTicketItem } from './useTicketsAdmin'

type Props = {
  ticket: AdminTicketItem
  active?: boolean
  onSelect: (ticketId: number) => void
}

export function TicketAdminMobileCard({ ticket, active, onSelect }: Props) {
  return (
    <AdminMobileCard
      title={ticket.titulo}
      subtitle={`#${ticket.ticketId} · ${ticket.solicitante}`}
      badges={<EstadoTicketBadge estado={ticket.estado} variant="admin" />}
      meta={[
        { label: 'Prioridad', value: ticket.prioridad },
        { label: 'Categoría', value: ticket.categoria ?? '—' },
      ]}
      active={active}
      onActivate={() => onSelect(ticket.ticketId)}
      ariaLabel={`Ver ticket ${ticket.titulo}`}
    />
  )
}
