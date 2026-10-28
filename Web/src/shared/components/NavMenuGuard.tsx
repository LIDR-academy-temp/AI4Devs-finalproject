import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useNavegacion } from '../../features/navegacion/NavegacionContext'
import {
  isPathAllowedByMenu,
  isSelfServicePath,
  normalizePath,
} from '../../features/navegacion/menuToNav'

export function NavMenuGuard() {
  const location = useLocation()
  const { loading, allowedPaths, source, tree } = useNavegacion()

  if (isSelfServicePath(location.pathname)) {
    return <Outlet />
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted">
        <span className="spinner-border spinner-border-sm" role="status" aria-label="Cargando menú" />
      </div>
    )
  }

  const enforceApiMenu = source === 'api' && tree.length > 0
  if (enforceApiMenu && !isPathAllowedByMenu(location.pathname, allowedPaths)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
