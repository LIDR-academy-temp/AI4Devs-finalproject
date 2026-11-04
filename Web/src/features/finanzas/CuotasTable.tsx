import type { CuotaEstado } from '../../shared/types/finanzas'
import { PortalDataTable, PortalDataTableBody, PortalDataTableHead } from '../../shared/components/portal'
import { cuotaEstadoBadgeClass } from './cuotaEstadoUi'
import { formatFecha, formatMxn, formatPeriodo } from './format'

type Props = { cuotas: CuotaEstado[] }

export function CuotasTable({ cuotas }: Props) {
  return (
    <PortalDataTable>
      <PortalDataTableHead>
        <tr>
          <th>Período</th>
          <th>Monto</th>
          <th>Vencimiento</th>
          <th>Estado</th>
        </tr>
      </PortalDataTableHead>
      <PortalDataTableBody>
        {cuotas.map((c) => (
          <tr key={c.cuotaId}>
            <td>{formatPeriodo(c.periodoInicio)}</td>
            <td>{formatMxn(c.monto)}</td>
            <td>{formatFecha(c.fechaVencimiento)}</td>
            <td>
              <span className={`cq-portal-badge ${cuotaEstadoBadgeClass(c.estado)}`}>{c.estado}</span>
            </td>
          </tr>
        ))}
      </PortalDataTableBody>
    </PortalDataTable>
  )
}
