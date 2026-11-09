import { formatMxn } from '../../finanzas/format'
import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { Moroso } from '../../../shared/types/finanzasAdmin'

type Props = {
  moroso: Moroso
}

export function MorosoAdminMobileCard({ moroso }: Props) {
  return (
    <AdminMobileCard
      title={moroso.nombre}
      subtitle={moroso.casa ?? 'Sin casa'}
      badges={
        <span className="badge bg-danger tabular-nums">{moroso.cuotasVencidas} vencidas</span>
      }
      meta={[
        { label: 'Adeudo', value: formatMxn(moroso.totalAdeudado) },
        {
          label: 'Moras',
          value:
            (moroso.morasAplicadas ?? 0) > 0
              ? `${moroso.morasAplicadas} aplicada(s) · ${formatMxn(moroso.totalMora ?? 0)}`
              : 'Sin mora',
        },
      ]}
    />
  )
}
