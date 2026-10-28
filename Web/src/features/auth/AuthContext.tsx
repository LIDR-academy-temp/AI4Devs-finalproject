import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiPost } from '../../shared/lib/apiClient'
import { setAccessToken } from '../../shared/lib/accessTokenStore'
import { refreshOnce, setRefreshHandlers } from '../../shared/lib/refreshSession'
import { sessionFromLoginResponse, type AuthSession, type LoginResponse } from './authSession'

export type { AuthSession } from './authSession'

type AuthContextValue = {
  session: AuthSession | null
  /** false hasta terminar RefreshToken al cargar la app (evita mandar a login en F5 en rutas profundas). */
  authReady: boolean
  login: (
    correo: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; requiereCambioPassword?: boolean }>
  cambiarPassword: (
    passwordActual: string,
    passwordNueva: string,
  ) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  children,
  initialSession = null,
}: {
  children: ReactNode
  initialSession?: AuthSession | null
}) {
  const [session, setSession] = useState<AuthSession | null>(initialSession)
  const [authReady, setAuthReady] = useState(() => initialSession != null)

  useEffect(() => {
    setRefreshHandlers({
      onRefreshed: (data) => {
        const next = sessionFromLoginResponse(data)
        if (next) {
          setSession(next)
        }
      },
      onRefreshFailed: () => {
        setAccessToken(null)
        setSession(null)
      },
    })

    if (initialSession != null) {
      setAuthReady(true)
      return
    }

    let active = true
    void refreshOnce().finally(() => {
      if (active) setAuthReady(true)
    })
    return () => {
      active = false
    }
  }, [initialSession])

  const login = useCallback(async (correo: string, password: string) => {
    const { data, problem, status } = await apiPost<LoginResponse>(
      '/SGR/AuthService/GenerateToken',
      { correo, password },
    )

    if (status === 429) {
      return { ok: false, error: 'Demasiados intentos, espera un momento.' }
    }

    if (!data) {
      if (status === 401) {
        return { ok: false, error: 'Credenciales inválidas' }
      }
      return { ok: false, error: problem?.detail ?? 'No se pudo iniciar sesión' }
    }

    setAccessToken(data.token)
    const next = sessionFromLoginResponse(data)
    if (!next) {
      return { ok: false, error: 'Token inválido' }
    }
    setSession(next)
    return { ok: true, requiereCambioPassword: data.requiereCambioPassword }
  }, [])

  const cambiarPassword = useCallback(
    async (passwordActual: string, passwordNueva: string) => {
      if (!session?.token) {
        return { ok: false, error: 'Sesión no válida' }
      }

      const { problem, status } = await apiPost(
        '/SGR/AuthService/CambiarPassword',
        { passwordActual, passwordNueva },
        session.token,
      )

      if (status === 204) {
        setAccessToken(null)
        setSession(null)
        return { ok: true }
      }

      return {
        ok: false,
        error: problem?.detail ?? 'No se pudo cambiar la contraseña',
      }
    },
    [session?.token],
  )

  const logout = useCallback(async () => {
    if (session?.token) {
      await apiPost('/SGR/AuthService/Logout', {}, session.token)
    }
    setAccessToken(null)
    setSession(null)
  }, [session?.token])

  const value = useMemo(
    () => ({ session, authReady, login, cambiarPassword, logout }),
    [session, authReady, login, cambiarPassword, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
