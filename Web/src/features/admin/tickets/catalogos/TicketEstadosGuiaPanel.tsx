import { TRANSICIONES_PERMITIDAS } from '../ticketTransitions'
import { displayEstadoAdmin } from '../../../tickets/ticketEstadoDisplay'

const ESTADOS_ORDEN = ['Nuevo', 'En seguimiento', 'Resuelto', 'Cerrado'] as const

export function TicketEstadosGuiaPanel() {
  return (
    <div className="alert alert-info py-2 small" role="status">
      Los estados del ticket no se editan desde aquí. Solo se muestran las transiciones permitidas por el
      sistema (INV-10).
    </div>
  )
}

export function TicketEstadosGuiaTable() {
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Estado (catálogo)</th>
            <th>Etiqueta en admin</th>
            <th>Transiciones permitidas</th>
          </tr>
        </thead>
        <tbody>
          {ESTADOS_ORDEN.map((estado) => {
            const { label, title } = displayEstadoAdmin(estado)
            const destinos = TRANSICIONES_PERMITIDAS[estado] ?? []
            return (
              <tr key={estado}>
                <td>{estado}</td>
                <td>
                  <span title={title}>{label}</span>
                </td>
                <td>
                  {destinos.length === 0 ? (
                    <span className="text-muted">—</span>
                  ) : (
                    destinos.map((d) => displayEstadoAdmin(d).label).join(', ')
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
