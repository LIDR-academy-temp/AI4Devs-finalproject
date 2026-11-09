import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { CategoriaDto } from '../../../shared/types/almacen'

type Props = {
  categoria: CategoriaDto
  active?: boolean
  onEdit: (c: CategoriaDto) => void
  onDelete: (c: CategoriaDto) => void
}

export function CategoriaAdminMobileCard({ categoria, active, onEdit, onDelete }: Props) {
  return (
    <div className="cq-admin-mobile-card-wrap mb-2">
      <AdminMobileCard
        title={categoria.nombre}
        active={active}
        onActivate={() => onEdit(categoria)}
        ariaLabel={`Editar ${categoria.nombre}`}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-danger w-100 mt-1"
        onClick={() => onDelete(categoria)}
      >
        Eliminar
      </button>
    </div>
  )
}
