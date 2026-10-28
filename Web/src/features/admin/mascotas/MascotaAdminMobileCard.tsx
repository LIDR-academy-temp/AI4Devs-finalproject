import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { MascotaListItem } from '../../../shared/types/mascotas'

type Props = {
  mascota: MascotaListItem
  active?: boolean
  onEdit: (m: MascotaListItem) => void
}

export function MascotaAdminMobileCard({ mascota, active, onEdit }: Props) {
  const vacunas =
    mascota.vacunasAlDia === undefined
      ? '—'
      : mascota.vacunasAlDia
        ? 'Al día'
        : 'Pendiente'

  return (
    <AdminMobileCard
      title={mascota.nombreMascota}
      subtitle={[mascota.tipoMascota, mascota.razaMascota ?? mascota.razaLibre].filter(Boolean).join(' · ') || '—'}
      meta={[
        { label: 'Dueño', value: mascota.nombreUsuario ?? '—' },
        { label: 'Casa', value: mascota.numeroCasa ?? '—' },
        { label: 'Vacunas', value: vacunas },
      ]}
      active={active}
      onActivate={() => onEdit(mascota)}
      ariaLabel={`Editar mascota ${mascota.nombreMascota}`}
    />
  )
}
