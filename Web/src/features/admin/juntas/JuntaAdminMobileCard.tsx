import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { JuntaListItem } from '../../../shared/types/juntas'

type Props = {
  junta: JuntaListItem
  active?: boolean
  onEdit: (j: JuntaListItem) => void
}

export function JuntaAdminMobileCard({ junta, active, onEdit }: Props) {
  return (
    <AdminMobileCard
      title={junta.titulo}
      subtitle={junta.ubicacion ?? '—'}
      badges={
        <span className={`badge ${junta.activa ? 'bg-success' : 'bg-secondary'}`}>
          {junta.activa ? 'Activa' : 'Inactiva'}
        </span>
      }
      meta={[
        {
          label: 'Programada',
          value: new Date(junta.fechaProgramada).toLocaleString('es-MX'),
        },
      ]}
      active={active}
      onActivate={() => void onEdit(junta)}
      ariaLabel={`Editar ${junta.titulo}`}
    />
  )
}
