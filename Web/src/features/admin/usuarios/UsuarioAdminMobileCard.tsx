import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { UsuarioPadronItem } from '../../../shared/types/usuariosAdmin'

type Props = {
  usuario: UsuarioPadronItem
  active?: boolean
  onEdit: (u: UsuarioPadronItem) => void
}

export function UsuarioAdminMobileCard({ usuario, active, onEdit }: Props) {
  return (
    <AdminMobileCard
      title={usuario.nombre}
      subtitle={usuario.correo}
      badges={
        <span className={`badge ${usuario.bActivo ? 'bg-success' : 'bg-secondary'}`}>
          {usuario.bActivo ? 'Activo' : 'Inactivo'}
        </span>
      }
      meta={[{ label: 'Perfil', value: usuario.perfil }]}
      active={active}
      onActivate={() => onEdit(usuario)}
      ariaLabel={`Editar ${usuario.correo}`}
    />
  )
}
