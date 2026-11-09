import { AdminMobileCard } from '../../shared/components/admin/AdminMobileCard'
import type { MenuAdminItem } from './types'

type Props = {
  menu: MenuAdminItem
  active?: boolean
  onSelect: (m: MenuAdminItem) => void
}

export function MenuAdminMobileCard({ menu, active, onSelect }: Props) {
  return (
    <AdminMobileCard
      title={menu.titulo}
      subtitle={menu.ruta ?? 'Sin ruta'}
      badges={<span className="badge bg-secondary tabular-nums">#{menu.orden}</span>}
      meta={menu.padreMenuId != null ? [{ label: 'Padre', value: String(menu.padreMenuId) }] : undefined}
      active={active}
      onActivate={() => onSelect(menu)}
      ariaLabel={`Editar menú ${menu.titulo}`}
    />
  )
}
