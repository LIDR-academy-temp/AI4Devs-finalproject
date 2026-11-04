import { Link } from 'react-router-dom'
import { ChevronRight, Ticket } from 'lucide-react'
import type { MiTicketItem } from '../../shared/types/tickets'
import {
  PortalEntityIcon,
  PortalEntityMain,
  PortalEntityMeta,
  PortalEntityTitle,
  PortalRowList,
  PortalRowListItem,
} from '../../shared/components/portal'
import { EstadoTicketBadge } from './EstadoTicketBadge'

export function TicketsList({
  items,
  ticketPathPrefix = '/tickets',
  embedded = false,
}: {
  items: MiTicketItem[]
  ticketPathPrefix?: string
  embedded?: boolean
}) {
  const rowContent = (t: MiTicketItem) => (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <PortalEntityIcon>
          <Ticket className="h-5 w-5" />
        </PortalEntityIcon>
        <PortalEntityMain>
          <PortalEntityTitle>{t.titulo}</PortalEntityTitle>
          <PortalEntityMeta>
            {t.categoria ? `${t.categoria} · ` : ''}
            {t.prioridad} · {new Date(t.fechaCreacion).toLocaleString('es-MX')}
          </PortalEntityMeta>
        </PortalEntityMain>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
        <EstadoTicketBadge estado={t.estado} />
        {embedded ? <ChevronRight className="cq-portal-ticket-row-chevron h-4 w-4" aria-hidden /> : null}
      </div>
    </>
  )

  if (embedded) {
    return (
      <PortalRowList>
        {items.map((t) => (
          <PortalRowListItem key={t.ticketId}>
            <Link
              to={`${ticketPathPrefix}/${t.ticketId}`}
              className="cq-portal-link-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              {rowContent(t)}
            </Link>
          </PortalRowListItem>
        ))}
      </PortalRowList>
    )
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
      {items.map((t) => (
        <li key={t.ticketId}>
          <Link
            to={`${ticketPathPrefix}/${t.ticketId}`}
            className="flex cursor-pointer flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 hover:bg-neutral-100"
          >
            {rowContent(t)}
          </Link>
        </li>
      ))}
    </ul>
  )
}
