import { Link } from 'react-router-dom'
import { formatFecha, formatMxn } from '../finanzas/format'
import type { ResumenResidente } from '../../shared/types/dashboard'

type Props = { data: ResumenResidente }

export function ResumenResidenteCards({ data }: Props) {
  return (
    <section className="space-y-4">
      {data.avisoVencida && (
        <div className="rounded-lg border border-danger bg-danger-light p-4 text-danger">
          <p className="font-medium">Tienes cuotas vencidas por regularizar.</p>
          <Link to="/finanzas/cuenta" className="mt-2 inline-block text-sm font-medium underline">
            Ver estado de cuenta
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-100 bg-surface-alt p-4 shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral">Tickets activos</p>
          <p className="mt-1 text-xl font-semibold text-primary-dark">{data.ticketsActivos}</p>
        </div>
        <div className="rounded-lg border border-neutral-100 bg-surface-alt p-4 shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral">Notificaciones sin leer</p>
          <p className="mt-1 text-xl font-semibold text-primary-dark">{data.notificacionesNoLeidas}</p>
        </div>
      </div>

      {data.estadoCuotaMes ? (
        <div className="rounded-lg border border-neutral-100 bg-surface-alt p-4 shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)]">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral">Cuota del mes</p>
          <p className="mt-1 text-lg font-semibold text-primary-dark">
            {formatMxn(data.estadoCuotaMes.monto)} — {data.estadoCuotaMes.estado}
          </p>
          <p className="text-sm text-neutral">
            Vence {formatFecha(data.estadoCuotaMes.fechaVencimiento)}
          </p>
        </div>
      ) : (
        <p className="text-neutral">Sin cuota registrada para el período actual.</p>
      )}
    </section>
  )
}
