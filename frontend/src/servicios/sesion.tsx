import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ErrorDeApi,
  cerrarSesion,
  iniciarSesion,
  listarEstaciones,
  registrarAlVencerSesion,
} from './cliente'

type EstadoSesion = 'verificando' | 'activa' | 'sin_sesion'

const AVISO_VENCIDA = 'Su sesión venció. Vuelva a ingresar.'

interface Sesion {
  estado: EstadoSesion
  aviso: string | null
  ingresar: (email: string, contrasena: string) => Promise<void>
  salir: () => Promise<void>
}

const ContextoSesion = createContext<Sesion | null>(null)

export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('verificando')
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    registrarAlVencerSesion(() => {
      setAviso(AVISO_VENCIDA)
      setEstado('sin_sesion')
    })
    // La cookie es HttpOnly: la única forma de saber si hay sesión es pedirle algo a la API.
    listarEstaciones(true)
      .then(() => setEstado('activa'))
      .catch((error: unknown) => {
        setEstado('sin_sesion')
        if (!(error instanceof ErrorDeApi && error.estado === 401)) {
          setAviso('No se pudo verificar la sesión.')
        }
      })
  }, [])

  const ingresar = useCallback(async (email: string, contrasena: string) => {
    await iniciarSesion(email, contrasena)
    setAviso(null)
    setEstado('activa')
  }, [])

  const salir = useCallback(async () => {
    try {
      await cerrarSesion()
    } finally {
      setAviso(null)
      setEstado('sin_sesion')
    }
  }, [])

  const valor = useMemo(
    () => ({ estado, aviso, ingresar, salir }),
    [estado, aviso, ingresar, salir],
  )
  return <ContextoSesion value={valor}>{children}</ContextoSesion>
}

export function useSesion(): Sesion {
  const sesion = use(ContextoSesion)
  if (!sesion) {
    throw new Error('useSesion requiere ProveedorDeSesion')
  }
  return sesion
}
