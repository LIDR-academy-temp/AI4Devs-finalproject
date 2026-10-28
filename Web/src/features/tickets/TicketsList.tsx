import { Link } from 'react-router-dom'
import type { MiTicketItem } from '../../shared/types/tickets'
import { EstadoTicketBadge } from './EstadoTicketBadge'

export function TicketsList({
  items,
  ticketPathPrefix = '/tickets',
}: {
  items: MiTicketItem[]
  ticketPathPrefix?: string
}) {
  return (
    <ul className="divide-y divide-slate-200 rounded-md border border-neutral-200">
      {items.map((t) => (
        <li key={t.ticketId}>
          <Link
            to={`${ticketPathPrefix}/${t.ticketId}`}
            className="flex cursor-pointer flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 hover:bg-slate-50"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium text-neutral-900">{t.titulo}</p>
              <p className="break-words text-xs text-neutral">
                {t.categoria ? `${t.categoria} · ` : ''}
                {t.prioridad} · {new Date(t.fechaCreacion).toLocaleString()}
              </p>
            </div>
            <EstadoTicketBadge estado={t.estado} className="shrink-0 self-start sm:self-center" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
