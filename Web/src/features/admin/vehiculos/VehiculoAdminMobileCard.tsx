import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { AutomovilListItem } from '../../../shared/types/vehiculos'

type Props = {
  vehiculo: AutomovilListItem
  active?: boolean
  onEdit: (v: AutomovilListItem) => void
}

export function VehiculoAdminMobileCard({ vehiculo, active, onEdit }: Props) {
  return (
    <AdminMobileCard
      title={vehiculo.placas ?? 'Sin placas'}
      subtitle={vehiculo.nombreUsuario ?? '—'}
      meta={[
        { label: 'Casa', value: vehiculo.numeroCasa ?? '—' },
        {
          label: 'Vehículo',
          value: [vehiculo.marca, vehiculo.modelo ?? vehiculo.modeloLibre].filter(Boolean).join(' ') || '—',
        },
      ]}
      active={active}
      onActivate={() => onEdit(vehiculo)}
      ariaLabel={`Editar vehículo ${vehiculo.placas ?? vehiculo.automovilId}`}
    />
  )
}
