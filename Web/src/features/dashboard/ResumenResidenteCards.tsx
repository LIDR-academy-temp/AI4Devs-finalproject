import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { formatFecha, formatMxn } from '../finanzas/format'
import { PortalStat, PortalStatStrip } from '../../shared/components/admin'
import type { ResumenResidente } from '../../shared/types/dashboard'

type Props = { data: ResumenResidente }

export function ResumenResidenteCards({ data }: Props) {
  const cuotaVencida = data.estadoCuotaMes?.estado === 'Vencida'

  return (
    <section className="flex flex-col gap-4">
      {data.avisoVencida && (
        <div className="cq-portal-alert" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-danger" aria-hidden />
            <p className="cq-portal-alert__text">Tienes cuotas vencidas por regularizar.</p>
          </div>
          <Link to="/finanzas/cuenta" className="cq-portal-alert__action">
            Ver estado de cuenta →
          </Link>
        </div>
      )}

      <PortalStatStrip>
        <PortalStat
          label="Tickets activos"
          value={data.ticketsActivos}
          valueClassName={data.ticketsActivos > 0 ? 'text-primary-dark' : ''}
        />
        <PortalStat
          label="Notificaciones sin leer"
          value={data.notificacionesNoLeidas}
          valueClassName={data.notificacionesNoLeidas > 0 ? 'text-danger' : ''}
        />
      </PortalStatStrip>

      {data.estadoCuotaMes ? (
        <div className={`cq-portal-stat-block${cuotaVencida ? ' border-danger/30 ring-1 ring-danger/10' : ''}`}>
          <p className="cq-portal-stat-block__label">Cuota del mes</p>
          <p className={`cq-portal-stat-block__value${cuotaVencida ? ' text-danger' : ''}`}>
            {formatMxn(data.estadoCuotaMes.monto)} — {data.estadoCuotaMes.estado}
          </p>
          <p className="cq-portal-stat-block__meta">
            Vence {formatFecha(data.estadoCuotaMes.fechaVencimiento)}
          </p>
          {cuotaVencida && (
            <Link to="/finanzas/cuenta" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
              Pagar o consultar detalle
            </Link>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral">Sin cuota registrada para el período actual.</p>
      )}
    </section>
  )
}
