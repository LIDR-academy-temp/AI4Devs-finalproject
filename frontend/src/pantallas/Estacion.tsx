import { Link, useParams } from 'react-router'
import { obtenerCondiciones } from '../servicios/cliente'
import { formatearFechaHora, formatearNumero } from '../servicios/serie'
import { useCarga } from '../servicios/useCarga'

/** Listado de sensores. La pantalla de decisión completa llega con WT-FE-01. */
export function Estacion() {
  const { estacionId = '' } = useParams()
  const { datos, error, cargando } = useCarga(() => obtenerCondiciones(estacionId), [estacionId])

  if (cargando) {
    return <p role="status">Cargando condiciones…</p>
  }
  if (error || !datos) {
    return (
      <p role="alert" className="error">
        {error ?? 'No se pudieron cargar las condiciones.'}
      </p>
    )
  }
  return (
    <section>
      <h2>{datos.estacion_nombre}</h2>
      {datos.medido_en && (
        <p className="secundario">Medición: {formatearFechaHora(datos.medido_en)}</p>
      )}
      <ul className="grilla">
        {datos.sensores.map((sensor) => (
          <li key={sensor.sensor_id}>
            <Link
              className="tarjeta enlace"
              to={`/estaciones/${estacionId}/sensores/${sensor.sensor_id}`}
            >
              <span className="etiqueta">{sensor.nombre}</span>
              <span className="valor">
                {formatearNumero(sensor.valor)} <small>{sensor.unidad}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
