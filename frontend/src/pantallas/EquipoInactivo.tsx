import { Link } from 'react-router'
import { obtenerCondiciones } from '../servicios/cliente'
import { formatearFechaHora } from '../servicios/serie'
import { useCarga } from '../servicios/useCarga'

/** Un equipo que dejó de llegar de SAT2: sin tablero instantáneo, solo sus históricos. */
export function EquipoInactivo({ estacionId }: { estacionId: string }) {
  const { datos, error, cargando } = useCarga(() => obtenerCondiciones(estacionId), [estacionId])

  if (cargando) {
    return <p role="status">Cargando el equipo…</p>
  }
  if (!datos) {
    return (
      <p role="alert" className="error">
        {error ?? 'No se pudo cargar el equipo.'}
      </p>
    )
  }

  return (
    <section className="decision">
      <h2>{datos.estacion_nombre}</h2>
      <p role="status" className="aviso">
        Equipo inactivo - solo históricos
        {datos.inactiva_desde &&
          `. Dejó de llegar de SAT2 el ${formatearFechaHora(datos.inactiva_desde)}.`}
      </p>
      <h3 id="sensores-inactivos">Sensores</h3>
      <ul className="lista" aria-labelledby="sensores-inactivos">
        {datos.sensores.map((sensor) => (
          <li key={sensor.sensor_id}>
            <Link
              className="tarjeta enlace"
              to={`/estaciones/${estacionId}/sensores/${sensor.sensor_id}`}
            >
              {sensor.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
