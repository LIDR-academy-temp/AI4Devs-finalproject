import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { CasaAdminItem } from '../../../shared/types/casasAdmin'

type Props = {
  casa: CasaAdminItem
  active?: boolean
  correoPropietario?: string
  onEdit: (c: CasaAdminItem) => void
}

export function CasaAdminMobileCard({ casa, active, correoPropietario, onEdit }: Props) {
  const propietario =
    casa.propietarioNombre ??
    (correoPropietario ? correoPropietario : casa.propietarioUsuarioId ? `ID ${casa.propietarioUsuarioId}` : '—')

  return (
    <AdminMobileCard
      title={`${casa.condominioNombre ?? casa.condominioId} · ${casa.numero ?? '—'}`}
      subtitle={casa.direccion ?? '—'}
      meta={[{ label: 'Propietario', value: propietario }]}
      active={active}
      onActivate={() => onEdit(casa)}
      ariaLabel={`Editar casa ${casa.numero ?? casa.casaId}`}
    />
  )
}
