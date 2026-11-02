import { Link } from 'react-router'
import type { LecturaSensor } from '../servicios/cliente'
import { formatearNumero } from '../servicios/serie'

interface Props {
  sensor: LecturaSensor
  destino: string
}

export function TarjetaSensor({ sensor, destino }: Props) {
  const clases = ['tarjeta', 'enlace', 'tarjeta-sensor']
  if (sensor.calidad === 'SOSPECHOSO') {
    clases.push('tarjeta-sospechosa')
  }
  if (sensor.calidad === 'FALTANTE') {
    clases.push('tarjeta-faltante')
  }
  if (sensor.alarma) {
    clases.push('tarjeta-alarma')
  }

  return (
    <Link className={clases.join(' ')} to={destino}>
      <span className="etiqueta">{sensor.nombre}</span>
      <span className="valor">
        {formatearNumero(sensor.valor)} <small>{sensor.unidad}</small>
      </span>
      {sensor.calidad === 'SOSPECHOSO' && <span className="marca-dato">⚠ Dato sospechoso</span>}
      {sensor.calidad === 'FALTANTE' && <span className="marca-dato">Sin dato válido</span>}
      {sensor.alarma && <span className="marca-dato">● En alarma</span>}
    </Link>
  )
}
