import { AdminMobileCard } from '../../../shared/components/admin/AdminMobileCard'
import type { VisitaListItem } from '../../../shared/types/visitas'

type Props = {
  visita: VisitaListItem
  onSalida?: (v: VisitaListItem) => void
}

export function VisitaAdminMobileCard({ visita, onSalida }: Props) {
  const enVisita = !visita.fechaSalida

  return (
    <div className="cq-admin-mobile-card-wrap mb-2">
      <AdminMobileCard
        title={visita.visitanteNombre}
        subtitle={`${visita.tipoIdentificacion}: ${visita.numeroIdentificacion}`}
        badges={
          enVisita ? (
            <span className="badge bg-warning text-dark">En visita</span>
          ) : (
            <span className="badge bg-secondary">Salida</span>
          )
        }
        meta={[
          { label: 'Casa', value: visita.numeroCasa ?? '—' },
          {
            label: 'Entrada',
            value: new Date(visita.fechaEntrada).toLocaleString('es-MX'),
          },
        ]}
      />
      {enVisita && onSalida && (
        <button
          type="button"
          className="btn btn-sm btn-success w-100 mt-1"
          aria-label={`Registrar salida de ${visita.visitanteNombre}`}
          onClick={() => onSalida(visita)}
        >
          Registrar salida
        </button>
      )}
    </div>
  )
}
