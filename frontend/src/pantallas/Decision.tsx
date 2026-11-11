import { useParams } from 'react-router'
import { BloqueEstado } from '../componentes/BloqueEstado'
import { TarjetaSensor } from '../componentes/TarjetaSensor'
import { obtenerCondiciones, obtenerRecomendacion } from '../servicios/cliente'
import { useEstaciones, useRecordarEstacion } from '../servicios/estaciones'
import { formatearFechaHora, formatearHoraDeArgentina } from '../servicios/serie'
import { useConsultaPeriodica } from '../servicios/useConsultaPeriodica'
import { EquipoInactivo } from './EquipoInactivo'

export function Decision() {
  const { estacionId = '' } = useParams()
  const estaciones = useEstaciones()
  useRecordarEstacion(estacionId)

  if (estaciones.cargando) {
    return <p role="status">Cargando condiciones…</p>
  }
  const estacion = estaciones.datos?.find((e) => String(e.id) === estacionId)
  // Un equipo inactivo no tiene recomendación: ni siquiera se la pide.
  if (estacion?.activa === false) {
    return <EquipoInactivo estacionId={estacionId} />
  }
  return <DecisionActiva estacionId={estacionId} />
}

function DecisionActiva({ estacionId }: { estacionId: string }) {
  const { datos, error, cargando, actualizadoEn } = useConsultaPeriodica(
    async () => {
      const [recomendacion, condiciones] = await Promise.all([
        obtenerRecomendacion(estacionId),
        obtenerCondiciones(estacionId),
      ])
      return { recomendacion, condiciones }
    },
    [estacionId],
  )

  if (cargando) {
    return <p role="status">Cargando condiciones…</p>
  }
  if (!datos) {
    return (
      <p role="alert" className="error">
        {error ?? 'No se pudieron cargar las condiciones.'}
      </p>
    )
  }

  const { recomendacion, condiciones } = datos
  const sinConexion = error !== null

  return (
    <section className="decision">
      <h2>{condiciones.estacion_nombre}</h2>

      <BloqueEstado recomendacion={recomendacion} sinConexion={sinConexion} />

      {!sinConexion && condiciones.ultima_ingesta_con_error && (
        <p role="alert" className="aviso">
          Sin conexión con la fuente de datos.
          {condiciones.ultima_ingesta_exitosa_en &&
            ` Última ingesta exitosa: ${formatearFechaHora(condiciones.ultima_ingesta_exitosa_en)}.`}
        </p>
      )}
      {!sinConexion && condiciones.estado_datos === 'DESACTUALIZADO' && (
        <p role="status" className="aviso">
          Los datos están desactualizados.
        </p>
      )}

      <h3>Condiciones actuales</h3>
      <ul className="grilla">
        {condiciones.sensores.map((sensor) => (
          <li key={sensor.sensor_id}>
            <TarjetaSensor
              sensor={sensor}
              destino={`/estaciones/${estacionId}/sensores/${sensor.sensor_id}`}
            />
          </li>
        ))}
      </ul>

      {actualizadoEn && (
        <p className="secundario actualizado">
          Última actualización de la pantalla: {formatearHoraDeArgentina(actualizadoEn)}. Se actualiza
          cada minuto.
        </p>
      )}
    </section>
  )
}
