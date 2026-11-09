import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

/** Rutas que requieren JWT en memoria pero permiten requiereCambioPassword (p. ej. cambio de contraseña). */
export function RequireSessionRoute() {
  const { session, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-muted">
        <span className="spinner-border spinner-border-sm" role="status" aria-label="Cargando sesión" />
      </div>
    )
  }

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
