import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Campo } from '../componentes/Campo'
import { GraficoSerie } from '../componentes/GraficoSerie'
import { obtenerCondiciones, obtenerHistorico } from '../servicios/cliente'
import {
  fechaDeArgentina,
  formatearFecha,
  formatearFechaHora,
  formatearNumero,
  primerDiaPermitido,
  rangoDeDias,
  rangoManual,
} from '../servicios/serie'
import type { Rango } from '../servicios/serie'
import { useCarga } from '../servicios/useCarga'

const RAPIDOS = [
  { clave: 'dia', texto: 'Día', dias: 1, titulo: 'últimas 24 horas' },
  { clave: 'semana', texto: 'Semana', dias: 7, titulo: 'últimos 7 días' },
  { clave: 'mes', texto: 'Mes', dias: 31, titulo: 'últimos 31 días' },
] as const

type Seleccion = (typeof RAPIDOS)[number]['clave'] | 'manual'

interface Consulta {
  rango: Rango
  titulo: string
}

/** Elige las fechas en el calendario del navegador, dentro del último año y hasta hoy. */
function RangoManual({ alElegir }: { alElegir: (consulta: Consulta) => void }) {
  const [hoy] = useState(() => fechaDeArgentina(new Date()))
  const [primero] = useState(() => primerDiaPermitido(new Date()))
  const [desde, setDesde] = useState(() => fechaDeArgentina(new Date(Date.now() - 6 * 86_400_000)))
  const [hasta, setHasta] = useState(hoy)
  const [error, setError] = useState<{ campo: 'desde' | 'hasta'; error: string } | null>(null)

  function ver(evento: FormEvent) {
    evento.preventDefault()
    const resultado = rangoManual(desde, hasta, new Date())
    if ('error' in resultado) {
      setError(resultado)
      return
    }
    setError(null)
    alElegir({
      rango: resultado.rango,
      titulo: `del ${formatearFecha(desde)} al ${formatearFecha(hasta)}`,
    })
  }

  return (
    <form onSubmit={ver} className="tarjeta formulario rango-manual" noValidate aria-label="Rango manual">
      <div className="fechas">
        <Campo
          etiqueta="Desde"
          type="date"
          min={primero}
          max={hoy}
          required
          value={desde}
          error={error?.campo === 'desde' ? error.error : undefined}
          onChange={(evento) => setDesde(evento.target.value)}
        />
        <Campo
          etiqueta="Hasta"
          type="date"
          min={primero}
          max={hoy}
          required
          value={hasta}
          error={error?.campo === 'hasta' ? error.error : undefined}
          onChange={(evento) => setHasta(evento.target.value)}
        />
      </div>
      <p className="ayuda">Hasta un mes, por ejemplo del 1/10 al 1/11, dentro del último año. Hora de Argentina.</p>
      <button type="submit">Ver el período</button>
    </form>
  )
}

const TEXTO_CALIDAD: Record<string, string> = {
  OK: 'Dato válido',
  FALTANTE: 'Sin dato válido',
  SOSPECHOSO: 'Dato sospechoso',
}

export function DetalleSensor() {
  const { estacionId = '', sensorId = '' } = useParams()
  // Abre en Día: lo más útil para decidir una aplicación (weather-track-historicos-sin-huecos, D4).
  const [seleccion, setSeleccion] = useState<Seleccion>('dia')
  // Se fija al elegir: recalcularlo en cada render repetiría la consulta sin fin.
  const [consulta, setConsulta] = useState<Consulta>(() => ({
    rango: rangoDeDias(RAPIDOS[0].dias, new Date()),
    titulo: RAPIDOS[0].titulo,
  }))
  const { rango } = consulta

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
        {RAPIDOS.map((opcion) => (
          <button
            key={opcion.clave}
            type="button"
            aria-pressed={seleccion === opcion.clave}
            className={seleccion === opcion.clave ? 'activo' : 'secundario-boton'}
            onClick={() => {
              setSeleccion(opcion.clave)
              setConsulta({ rango: rangoDeDias(opcion.dias, new Date()), titulo: opcion.titulo })
            }}
          >
            {opcion.texto}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={seleccion === 'manual'}
          className={seleccion === 'manual' ? 'activo' : 'secundario-boton'}
          onClick={() => setSeleccion('manual')}
        >
          Elegir fechas
        </button>
      </div>
      {seleccion === 'manual' && <RangoManual alElegir={setConsulta} />}
      <p className="secundario">Período: {consulta.titulo}.</p>

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
            titulo={`${nombre}: ${consulta.titulo}, en ${historico.datos.unidad}`}
          />
        </>
      )}
    </section>
  )
}
