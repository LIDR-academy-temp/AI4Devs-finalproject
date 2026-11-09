import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { ArchivoListItem } from '../../../shared/types/archivos'

type Props = {
  archivo: ArchivoListItem
  active?: boolean
  onEdit: (a: ArchivoListItem) => void
}

export function ArchivoAdminMobileCard({ archivo, active, onEdit }: Props) {
  return (
    <AdminMobileCard
      title={archivo.nombre}
      subtitle={archivo.tipoArchivo ?? '—'}
      meta={[
        {
          label: 'Subido',
          value: archivo.fechaCreacion ? new Date(archivo.fechaCreacion).toLocaleDateString('es-MX') : '—',
        },
      ]}
      active={active}
      onActivate={() => onEdit(archivo)}
      ariaLabel={`Editar ${archivo.nombre}`}
    />
  )
}
