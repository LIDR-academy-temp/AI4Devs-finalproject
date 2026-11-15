import { useEffect, useState } from 'react'
import { mensajeDeError } from './cliente'

export const INTERVALO_DE_ACTUALIZACION_MS = 60_000

interface Consulta<T> {
  datos: T | null
  /** Hay datos anteriores, pero la última actualización falló: pueden no estar vigentes. */
  error: string | null
  cargando: boolean
  actualizadoEn: Date | null
}

/** Repite la consulta periódicamente y conserva el último dato para poder explicar la falla. */
export function useConsultaPeriodica<T>(
  consulta: () => Promise<T>,
  dependencias: unknown[],
  intervaloMs = INTERVALO_DE_ACTUALIZACION_MS,
): Consulta<T> {
  const [estado, setEstado] = useState<Consulta<T>>({
    datos: null,
    error: null,
    cargando: true,
    actualizadoEn: null,
  })

  useEffect(() => {
    let vigente = true

    function actualizar() {
      consulta()
        .then((datos) => {
          if (vigente) {
            setEstado({ datos, error: null, cargando: false, actualizadoEn: new Date() })
          }
        })
        .catch((error: unknown) => {
          if (vigente) {
            setEstado((anterior) => ({
              ...anterior,
              error: mensajeDeError(error),
              cargando: false,
            }))
          }
        })
    }

    // En un móvil, una pestaña en segundo plano puede quedar suspendida y atrasarse.
    function alVolverAPrimerPlano() {
      if (document.visibilityState === 'visible') {
        actualizar()
      }
    }

    setEstado({ datos: null, error: null, cargando: true, actualizadoEn: null })
    actualizar()
    const temporizador = setInterval(actualizar, intervaloMs)
    document.addEventListener('visibilitychange', alVolverAPrimerPlano)
    return () => {
      vigente = false
      clearInterval(temporizador)
      document.removeEventListener('visibilitychange', alVolverAPrimerPlano)
    }
    // Las dependencias las indica quien llama; `consulta` cambia en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, intervaloMs])

  return estado
}
