import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { TipoArchivoItem } from '../../../shared/types/archivos'

type Props = {
  tipo: TipoArchivoItem
  active?: boolean
  onEdit: (t: TipoArchivoItem) => void
}

export function TipoArchivoAdminMobileCard({ tipo, active, onEdit }: Props) {
  return (
    <AdminMobileCard
      title={tipo.tipoArchivo}
      meta={[{ label: 'ID', value: String(tipo.tipoArchivoId) }]}
      active={active}
      onActivate={() => onEdit(tipo)}
      ariaLabel={`Editar tipo ${tipo.tipoArchivo}`}
    />
  )
}
