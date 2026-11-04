import { formatMxn } from '../finanzas/format'
import { PortalStat, PortalStatStrip } from '../../shared/components/admin'
import type { ResumenAdmin } from '../../shared/types/dashboard'

type Props = { data: ResumenAdmin }

export function ResumenAdminCards({ data }: Props) {
  const cards = [
    { label: 'Tickets nuevos', value: String(data.ticketsNuevos), accent: data.ticketsNuevos > 0 },
    { label: 'En seguimiento', value: String(data.ticketsEnSeguimiento) },
    { label: 'Morosos (mes)', value: String(data.morososMes), accent: data.morososMes > 0 },
    { label: 'Monto cobrado', value: formatMxn(data.montoCobrado) },
    { label: 'Monto pendiente', value: formatMxn(data.montoPendiente) },
    { label: 'Ocupación', value: `${data.ocupacion}%` },
    {
      label: 'Tickets por canal',
      value: `Web ${data.ticketsPorCanal.web} · Telegram ${data.ticketsPorCanal.telegram}`,
    },
  ]

  return (
    <PortalStatStrip className="sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <PortalStat
          key={c.label}
          label={c.label}
          value={c.value}
          valueClassName={c.accent ? 'text-primary-dark' : ''}
        />
      ))}
    </PortalStatStrip>
  )
}
