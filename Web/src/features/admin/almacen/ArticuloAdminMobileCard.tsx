import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { ArticuloListItem } from '../../../shared/types/almacen'

type Props = {
  articulo: ArticuloListItem
  active?: boolean
  onEdit: (a: ArticuloListItem) => void
}

export function ArticuloAdminMobileCard({ articulo, active, onEdit }: Props) {
  return (
    <AdminMobileCard
      title={articulo.nombre}
      subtitle={articulo.categoria ?? 'Sin categoría'}
      badges={
        articulo.bajoMinimo ? (
          <span className="badge bg-danger">Bajo mínimo</span>
        ) : (
          <span className="badge bg-success">OK</span>
        )
      }
      meta={[
        { label: 'Stock', value: String(articulo.stock) },
        { label: 'Mín.', value: String(articulo.stockMinimo) },
        { label: 'Ubicación', value: articulo.ubicacion ?? '—' },
      ]}
      active={active}
      onActivate={() => onEdit(articulo)}
      ariaLabel={`Editar ${articulo.nombre}`}
    />
  )
}
