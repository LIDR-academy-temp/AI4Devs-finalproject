import { createContext, use, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { listarEstaciones } from './cliente'
import type { Estacion } from './cliente'
import { useCarga } from './useCarga'
import type { Carga } from './useCarga'

const ContextoEstaciones = createContext<Carga<Estacion[]> | null>(null)

interface UltimaEstacion {
  /** La última estación que se vio, para volver a ella desde Administración o Mi cuenta. */
  ultima: string | null
  recordar: (estacionId: string) => void
}

const ContextoUltimaEstacion = createContext<UltimaEstacion>({ ultima: null, recordar: () => undefined })

/** Una sola consulta de las estaciones para el selector, la pantalla inicial y la decisión. */
export function ProveedorDeEstaciones({ children }: { children: ReactNode }) {
  const carga = useCarga(() => listarEstaciones(), [])
  const [ultima, setUltima] = useState<string | null>(null)
  const recuerdo = useMemo(() => ({ ultima, recordar: setUltima }), [ultima])
  return (
    <ContextoEstaciones value={carga}>
      <ContextoUltimaEstacion value={recuerdo}>{children}</ContextoUltimaEstacion>
    </ContextoEstaciones>
  )
}

export function useUltimaEstacion(): UltimaEstacion {
  return use(ContextoUltimaEstacion)
}

/** Las pantallas de una estación la recuerdan para el enlace «Volver a la estación». */
export function useRecordarEstacion(estacionId: string): void {
  const { recordar } = useUltimaEstacion()
  useEffect(() => {
    if (estacionId) {
      recordar(estacionId)
    }
  }, [estacionId, recordar])
}

export function useEstaciones(): Carga<Estacion[]> {
  const carga = use(ContextoEstaciones)
  if (!carga) {
    throw new Error('useEstaciones requiere ProveedorDeEstaciones')
  }
  return carga
}

export function nombreEnSelector(estacion: Estacion): string {
  return estacion.activa ? estacion.nombre : `${estacion.nombre} (Equipo inactivo)`
}
