import { useEffect, useState } from 'react'
import { mensajeDeError } from './cliente'

interface Carga<T> {
  datos: T | null
  error: string | null
  cargando: boolean
}

/** Ejecuta una consulta y descarta la respuesta si la pantalla ya pidió otra. */
export function useCarga<T>(consulta: () => Promise<T>, dependencias: unknown[]): Carga<T> {
  const [carga, setCarga] = useState<Carga<T>>({ datos: null, error: null, cargando: true })

  useEffect(() => {
    let vigente = true
    setCarga((anterior) => ({ ...anterior, error: null, cargando: true }))
    consulta()
      .then((datos) => {
        if (vigente) {
          setCarga({ datos, error: null, cargando: false })
        }
      })
      .catch((error: unknown) => {
        if (vigente) {
          setCarga({ datos: null, error: mensajeDeError(error), cargando: false })
        }
      })
    return () => {
      vigente = false
    }
    // Las dependencias las indica quien llama; `consulta` cambia en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias)

  return carga
}
