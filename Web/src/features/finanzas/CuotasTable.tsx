import type { CuotaEstado } from '../../shared/types/finanzas'
import { formatFecha, formatMxn, formatPeriodo } from './format'

const estadoClass: Record<string, string> = {
  Pagada: 'bg-success-light text-success',
  Pendiente: 'bg-warning-light text-warning',
  Vencida: 'bg-danger-light text-danger',
}

type Props = { cuotas: CuotaEstado[] }

export function CuotasTable({ cuotas }: Props) {
  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface text-neutral">
          <tr>
            <th className="px-3 py-2 font-medium">Período</th>
            <th className="px-3 py-2 font-medium">Monto</th>
            <th className="px-3 py-2 font-medium">Vencimiento</th>
            <th className="px-3 py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {cuotas.map((c) => (
            <tr
              key={c.cuotaId}
              className={c.esVencida ? 'bg-danger-light' : 'border-t border-neutral-100'}
            >
              <td className="px-3 py-2">{formatPeriodo(c.periodoInicio)}</td>
              <td className="px-3 py-2">{formatMxn(c.monto)}</td>
              <td className="px-3 py-2">{formatFecha(c.fechaVencimiento)}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline rounded px-2 py-0.5 text-xs font-medium ${estadoClass[c.estado] ?? 'bg-surface-alt'}`}
                >
                  {c.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
