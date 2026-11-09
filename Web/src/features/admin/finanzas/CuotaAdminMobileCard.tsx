import { formatFecha, formatMxn, formatPeriodo } from '../../finanzas/format'
import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import { cuotaMontoTotal } from './cuotaMontoUtils'
import type { CuotaEstado } from '../../../shared/types/finanzas'

const estadoClass: Record<string, string> = {
  Pagada: 'bg-success',
  Pendiente: 'bg-warning text-dark',
  Vencida: 'bg-danger',
}

type Props = {
  cuota: CuotaEstado
  onRegistrarPago?: (c: CuotaEstado) => void
}

export function CuotaAdminMobileCard({ cuota, onRegistrarPago }: Props) {
  const pendiente = cuota.estado !== 'Pagada'

  return (
    <div className="cq-admin-mobile-card-wrap mb-2">
      <AdminMobileCard
        title={formatPeriodo(cuota.periodoInicio)}
        subtitle={formatMxn(cuotaMontoTotal(cuota))}
        badges={
          <span className={`badge ${estadoClass[cuota.estado] ?? 'bg-secondary'}`}>
            {cuota.estado}
          </span>
        }
        meta={[{ label: 'Vence', value: formatFecha(cuota.fechaVencimiento) }]}
      />
      {pendiente && onRegistrarPago && (
        <button
          type="button"
          className="btn btn-sm btn-primary w-100 mt-1"
          onClick={() => onRegistrarPago(cuota)}
        >
          Registrar pago
        </button>
      )}
    </div>
  )
}
