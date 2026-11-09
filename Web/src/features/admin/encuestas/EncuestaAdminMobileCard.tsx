import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { EncuestaListItem } from '../../../shared/types/encuestas'

type Props = {
  encuesta: EncuestaListItem
  active?: boolean
  onEdit: (e: EncuestaListItem) => void
}

export function EncuestaAdminMobileCard({ encuesta, active, onEdit }: Props) {
  return (
    <AdminMobileCard
      title={encuesta.titulo}
      subtitle={encuesta.activa ? 'Activa' : 'Inactiva'}
      meta={[
        { label: 'Inicio', value: encuesta.fechaInicio ? new Date(encuesta.fechaInicio).toLocaleDateString('es-MX') : '—' },
        { label: 'Fin', value: encuesta.fechaFin ? new Date(encuesta.fechaFin).toLocaleDateString('es-MX') : '—' },
      ]}
      active={active}
      onActivate={() => onEdit(encuesta)}
      ariaLabel={
        encuesta.activa ? `Ver encuesta ${encuesta.titulo}` : `Editar ${encuesta.titulo}`
      }
    />
  )
}
