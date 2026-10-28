import { displayEstadoAdmin } from './ticketEstadoDisplay'

const ESTADO_COLORS: Record<string, string> = {
  Nuevo: 'bg-primary-50 text-primary-dark',
  'En seguimiento': 'bg-warning-light text-warning',
  Resuelto: 'bg-success-light text-success',
  Cerrado: 'bg-neutral-100 text-neutral-700',
}

export function EstadoTicketBadge({
  estado,
  className,
  variant = 'default',
}: {
  estado: string
  className?: string
  variant?: 'default' | 'admin'
}) {
  const cls = ESTADO_COLORS[estado] ?? 'bg-neutral-100 text-neutral-700'
  const text =
    variant === 'admin' ? displayEstadoAdmin(estado).label : estado
  const title = variant === 'admin' ? displayEstadoAdmin(estado).title : undefined
  return (
    <span
      className={`inline-flex max-w-full break-words rounded-full px-2 py-0.5 text-center text-xs font-medium ${cls} ${className ?? ''}`}
      title={title}
    >
      {text}
    </span>
  )
}
