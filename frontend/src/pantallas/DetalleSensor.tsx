import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { GraficoSerie } from '../componentes/GraficoSerie'
import { obtenerCondiciones, obtenerHistorico } from '../servicios/cliente'
import { formatearFechaHora, formatearNumero, rangoDeDias } from '../servicios/serie'
import { useCarga } from '../servicios/useCarga'

const RANGOS = [7, 31] as const
type Dias = (typeof RANGOS)[number]

const TEXTO_CALIDAD: Record<string, string> = {
  OK: 'Dato válido',
  FALTANTE: 'Sin dato válido',
  SOSPECHOSO: 'Dato sospechoso',
}

export function DetalleSensor() {
  const { estacionId = '', sensorId = '' } = useParams()
  const [dias, setDias] = useState<Dias>(7)
  // Se fija al elegir: recalcularlo en cada render repetiría la consulta sin fin.
  const [rango, setRango] = useState(() => rangoDeDias(7, new Date()))

  const condiciones = useCarga(() => obtenerCondiciones(estacionId), [estacionId])
  const historico = useCarga(
    () => obtenerHistorico(estacionId, sensorId, rango.desde, rango.hasta),
    [estacionId, sensorId, rango],
  )

  const sensor = condiciones.datos?.sensores.find((s) => String(s.sensor_id) === sensorId)
  const nombre = sensor?.nombre ?? 'Sensor'

  return (
    <section>
      <Link to={`/estaciones/${estacionId}`} className="volver">
        ← Volver a la estación
      </Link>
      <h2>{nombre}</h2>

      {sensor && (
        <div className="tarjeta">
          <p className="valor">
            {formatearNumero(sensor.valor)} <small>{sensor.unidad}</small>
          </p>
          <p className="secundario">
            {TEXTO_CALIDAD[sensor.calidad]}
            {sensor.alarma ? ' · En alarma' : ''}
            {condiciones.datos?.medido_en &&
              ` · ${formatearFechaHora(condiciones.datos.medido_en)}`}
          </p>
        </div>
      )}
      {condiciones.error && (
        <p role="alert" className="error">
          {condiciones.error}
        </p>
      )}

      <h3>Históricos</h3>
      <div role="group" aria-label="Rango de fechas" className="rangos">
        {RANGOS.map((opcion) => (
          <button
            key={opcion}
            type="button"
            aria-pressed={dias === opcion}
            className={dias === opcion ? 'activo' : 'secundario-boton'}
            onClick={() => {
              setDias(opcion)
              setRango(rangoDeDias(opcion, new Date()))
            }}
          >
            Últimos {opcion} días
          </button>
        ))}
      </div>

      {historico.cargando && <p role="status">Cargando históricos…</p>}
      {historico.error && (
        <p role="alert" className="error">
          {historico.error}
        </p>
      )}
      {historico.datos && !historico.cargando && historico.datos.resumen.cantidad === 0 && (
        <p role="status">No hay datos válidos en este período.</p>
      )}
      {historico.datos && !historico.cargando && historico.datos.resumen.cantidad > 0 && (
        <>
          <dl className="resumen">
            <div>
              <dt>Máximo</dt>
              <dd>{formatearNumero(historico.datos.resumen.maximo)}</dd>
            </div>
            <div>
              <dt>Mínimo</dt>
              <dd>{formatearNumero(historico.datos.resumen.minimo)}</dd>
            </div>
            <div>
              <dt>Promedio</dt>
              <dd>{formatearNumero(historico.datos.resumen.promedio)}</dd>
            </div>
            <div>
              <dt>Registros</dt>
              <dd>{formatearNumero(historico.datos.resumen.cantidad)}</dd>
            </div>
          </dl>
          <GraficoSerie
            puntos={historico.datos.puntos}
            unidad={historico.datos.unidad}
            titulo={`${nombre}: últimos ${dias} días, en ${historico.datos.unidad}`}
          />
        </>
      )}
    </section>
  )
}
