import { formatFecha, formatMxn, formatPeriodo } from '../../finanzas/format'
import { cuotaMontoTotal } from './cuotaMontoUtils'
import type { CuotaEstado } from '../../../shared/types/finanzas'

const estadoBadgeClass: Record<string, string> = {
  Pagada: 'badge bg-success',
  Pendiente: 'badge bg-warning text-dark',
  Vencida: 'badge bg-danger',
}

type Props = {
  cuotas: CuotaEstado[]
  onRegistrarPago?: (c: CuotaEstado) => void
}

export function CuotasAdminTable({ cuotas, onRegistrarPago }: Props) {
  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover mb-0">
        <thead>
          <tr>
            <th>Período</th>
            <th className="text-end">Monto</th>
            <th>Vencimiento</th>
            <th>Estado</th>
            <th className="text-center cq-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cuotas.map((c) => {
            const pendiente = c.estado !== 'Pagada'
            return (
              <tr key={c.cuotaId} className={c.esVencida ? 'table-danger' : undefined}>
                <td className="min-w-0">{formatPeriodo(c.periodoInicio)}</td>
                <td className="tabular-nums text-end">
                  {formatMxn(cuotaMontoTotal(c))}
                  {(c.montoMora ?? 0) > 0 && (
                    <span className="d-block text-muted small">
                      base {formatMxn(c.monto)} + mora {formatMxn(c.montoMora ?? 0)}
                    </span>
                  )}
                </td>
                <td className="tabular-nums text-nowrap">{formatFecha(c.fechaVencimiento)}</td>
                <td>
                  <span className={estadoBadgeClass[c.estado] ?? 'badge bg-secondary'}>{c.estado}</span>
                </td>
                <td className="text-center cq-actions text-nowrap">
                  {pendiente && onRegistrarPago ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => onRegistrarPago(c)}
                      aria-label={`Registrar pago cuota ${c.cuotaId}`}
                    >
                      <i className="mdi mdi-cash-check mr-1" aria-hidden="true" />
                      Registrar pago
                    </button>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
