import { Link, Navigate } from 'react-router'
import { listarEstaciones } from '../servicios/cliente'
import { useCarga } from '../servicios/useCarga'

export function Estaciones() {
  const { datos, error, cargando } = useCarga(() => listarEstaciones(), [])

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
    return <p role="status">No tiene estaciones asignadas. Consulte con quien administra el sistema.</p>
  }
  if (datos.length === 1) {
    return <Navigate to={`/estaciones/${datos[0].id}`} replace />
  }
  return (
    <section>
      <h2>Elija una estación</h2>
      <ul className="lista">
        {datos.map((estacion) => (
          <li key={estacion.id}>
            <Link className="tarjeta enlace" to={`/estaciones/${estacion.id}`}>
              {estacion.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
