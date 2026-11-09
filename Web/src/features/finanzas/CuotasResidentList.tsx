import { Receipt } from 'lucide-react'
import type { CuotaEstado } from '../../shared/types/finanzas'
import {
  PortalContentListRow,
  PortalRowList,
} from '../../shared/components/admin'
import { cuotaEstadoBadgeClass } from './cuotaEstadoUi'
import { formatFecha, formatMxn, formatPeriodo } from './format'

type Props = { cuotas: CuotaEstado[] }

export function CuotasResidentList({ cuotas }: Props) {
  return (
    <PortalRowList>
      {cuotas.map((c) => (
        <PortalContentListRow
          key={c.cuotaId}
          icon={Receipt}
          title={formatPeriodo(c.periodoInicio)}
          meta={`${formatMxn(c.monto)} · Vence ${formatFecha(c.fechaVencimiento)}`}
          trailing={
            <span className={`cq-portal-badge ${cuotaEstadoBadgeClass(c.estado)}`}>{c.estado}</span>
          }
        />
      ))}
    </PortalRowList>
  )
}
