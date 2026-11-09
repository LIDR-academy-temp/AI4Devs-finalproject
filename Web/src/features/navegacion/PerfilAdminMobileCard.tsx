import { AdminMobileCard } from '../../shared/components/admin/AdminMobileCard'
import type { PerfilListItem } from './types'

type Props = {
  perfil: PerfilListItem
  onPermisos: (perfilId: number) => void
}

export function PerfilAdminMobileCard({ perfil, onPermisos }: Props) {
  return (
    <AdminMobileCard
      title={perfil.nombre}
      subtitle={perfil.descripcion ?? '—'}
      badges={
        perfil.bAdministrador ? (
          <span className="badge bg-primary">Admin</span>
        ) : undefined
      }
      onActivate={() => onPermisos(perfil.perfilId)}
      ariaLabel={`Permisos menú de ${perfil.nombre}`}
    />
  )
}
