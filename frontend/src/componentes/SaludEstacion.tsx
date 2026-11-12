import { useEffect, useState } from 'react'
import type { CondicionesActuales } from '../servicios/cliente'
import { formatearMomentoDeArgentina } from '../servicios/serie'

type Salud = CondicionesActuales['salud']

/** El color acompaña al texto; nunca lo reemplaza (weather-track-monitoreo, D7). */
const SEMAFORO: Record<Salud, { texto: string; clase: string; explicacion: string }> = {
  EN_VIVO: {
    texto: 'En vivo',
    clase: 'estado-apto',
    explicacion: 'La ingesta funciona y el último dato tiene 30 minutos o menos.',
  },
  CON_DEMORAS: {
    texto: 'Con demoras',
    clase: 'estado-precaucion',
    explicacion:
      'La ingesta funciona, pero el último ciclo falló o SAT2 no trae datos nuevos hace más de 30 minutos.',
  },
  CAIDO: {
    texto: 'Caído',
    clase: 'estado-no-aplicar',
    explicacion: 'No hubo ciclos de ingesta en más de 20 minutos: la recomendación no está al día.',
  },
  MODO_PRUEBA: {
    texto: 'Modo prueba',
    clase: 'estado-neutro',
    explicacion: 'El modo prueba no ejecuta ciclos de ingesta.',
  },
}

const RESULTADO: Record<string, string> = {
  EXITO: 'terminó bien',
  PARCIAL: 'terminó con datos parciales',
  ERROR: 'terminó con error',
}

/** Avanza al cambiar el minuto, para que el reloj coincida con el del teléfono. */
function useReloj(): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>
    function programar() {
      const hastaElMinuto = 60_000 - (Date.now() % 60_000)
      temporizador = setTimeout(() => {
        setAhora(new Date())
        programar()
      }, hastaElMinuto)
    }
    programar()
    return () => clearTimeout(temporizador)
  }, [])
  return ahora
}

export function SaludEstacion({ condiciones }: { condiciones: CondicionesActuales }) {
  const ahora = useReloj()
  const semaforo = SEMAFORO[condiciones.salud]
  const intento = condiciones.ultimo_intento

  return (
    <section className={`salud ${semaforo.clase}`} aria-labelledby="titulo-salud">
      <div className="salud-encabezado">
        <h3 id="titulo-salud">Salud de la estación</h3>
        <p className="semaforo">
          <span className="semaforo-luz" aria-hidden="true" />
          {semaforo.texto}
        </p>
      </div>
      <dl className="estado-datos">
        <div>
          <dt>Hora actual (Argentina, UTC−3)</dt>
          <dd>{formatearMomentoDeArgentina(ahora.toISOString())}</dd>
        </div>
        <div>
          <dt>Último intento de ingesta</dt>
          <dd>
            {intento
              ? `${formatearMomentoDeArgentina(intento.en)}, ${RESULTADO[intento.resultado]}`
              : 'Sin ciclos todavía'}
          </dd>
        </div>
        <div>
          <dt>Último dato de SAT2</dt>
          <dd>{condiciones.medido_en ? formatearMomentoDeArgentina(condiciones.medido_en) : 'Sin datos'}</dd>
        </div>
      </dl>
      <p className="estado-explicacion">{semaforo.explicacion}</p>
    </section>
  )
}
