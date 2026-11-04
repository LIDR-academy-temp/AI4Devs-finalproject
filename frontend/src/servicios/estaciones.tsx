import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import { listarEstaciones } from './cliente'
import type { Estacion } from './cliente'
import { useCarga } from './useCarga'
import type { Carga } from './useCarga'

const ContextoEstaciones = createContext<Carga<Estacion[]> | null>(null)

/** Una sola consulta de las estaciones para el selector, la pantalla inicial y la decisión. */
export function ProveedorDeEstaciones({ children }: { children: ReactNode }) {
  const carga = useCarga(() => listarEstaciones(), [])
  return <ContextoEstaciones value={carga}>{children}</ContextoEstaciones>
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
