import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { AppShell } from './AppShell'

export function PrivateRoute() {
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

  if (session.perfil === 'Trabajador') {
    return <Navigate to="/trabajador/tickets" replace />
  }

  if (session.perfil === 'Guardia') {
    return <Navigate to="/guardia/validar-pase" replace />
  }

  if (session.requiereCambioPassword) {
    return <Navigate to="/cambiar-password" replace />
  }

  return <AppShell />
}
