import { displayEstadoAdmin } from './ticketEstadoDisplay'

const ESTADO_COLORS: Record<string, string> = {
  Nuevo: 'bg-primary-light text-primary-dark border border-primary/25',
  'En seguimiento': 'bg-warning-light text-warning border border-warning/30',
  Resuelto: 'bg-success-light text-success border border-success/25',
  Cerrado: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
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
      className={`cq-portal-badge inline-flex max-w-full break-words text-center ${cls} ${className ?? ''}`}
      title={title}
    >
      {text}
    </span>
  )
}
