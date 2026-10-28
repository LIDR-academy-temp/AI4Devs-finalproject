import { formatMxn } from '../finanzas/format'
import type { ResumenAdmin } from '../../shared/types/dashboard'

type Props = { data: ResumenAdmin }

export function ResumenAdminCards({ data }: Props) {
  const cards = [
    { label: 'Tickets nuevos', value: String(data.ticketsNuevos) },
    { label: 'En seguimiento', value: String(data.ticketsEnSeguimiento) },
    { label: 'Morosos (mes)', value: String(data.morososMes) },
    { label: 'Monto cobrado', value: formatMxn(data.montoCobrado) },
    { label: 'Monto pendiente', value: formatMxn(data.montoPendiente) },
    { label: 'Ocupación', value: `${data.ocupacion}%` },
    {
      label: 'Tickets por canal',
      value: `Web ${data.ticketsPorCanal.web} · Telegram ${data.ticketsPorCanal.telegram}`,
    },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral">{c.label}</p>
          <p className="mt-1 text-lg font-semibold text-primary-dark">{c.value}</p>
        </div>
      ))}
    </section>
  )
}
