import { Navigate } from 'react-router'
import { useEstaciones } from '../servicios/estaciones'

/** Abre la primera estación activa o, si todas están inactivas, la primera. */
export function Estaciones() {
  const { datos, error, cargando } = useEstaciones()

  if (cargando) {
    return <p role="status">Cargando estaciones…</p>
  }
  if (error) {
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  }
  if (!datos || datos.length === 0) {
    return <p role="status">Aún no se recibieron estaciones de la fuente de datos.</p>
  }
  const primera = datos.find((estacion) => estacion.activa) ?? datos[0]
  return <Navigate to={`/estaciones/${primera.id}`} replace />
}
