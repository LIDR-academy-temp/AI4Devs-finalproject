import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { PrestamoListItem } from '../../../shared/types/almacen'

type Props = {
  prestamo: PrestamoListItem
  devolviendo?: boolean
  onDevolver?: (p: PrestamoListItem) => void
}

export function PrestamoAdminMobileCard({ prestamo, devolviendo, onDevolver }: Props) {
  const prestado = prestamo.estado === 'PRESTADO'

  return (
    <div className="cq-admin-mobile-card-wrap mb-2">
      <AdminMobileCard
        title={prestamo.nombreArticulo}
        subtitle={prestamo.nombreUsuario ?? prestamo.correoUsuario ?? '—'}
        badges={
          <span className={`badge ${prestado ? 'bg-warning text-dark' : 'bg-success'}`}>
            {prestamo.estado}
          </span>
        }
        meta={[
          { label: 'Cantidad', value: String(prestamo.cantidad) },
          {
            label: 'Préstamo',
            value: new Date(prestamo.fechaPrestamo).toLocaleDateString('es-MX'),
          },
        ]}
      />
      {prestado && onDevolver && (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary w-100 mt-1"
          disabled={devolviendo}
          aria-label={`Devolver préstamo de ${prestamo.nombreArticulo}`}
          onClick={() => onDevolver(prestamo)}
        >
          Devolver
        </button>
      )}
    </div>
  )
}
