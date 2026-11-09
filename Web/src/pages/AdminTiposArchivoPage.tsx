import { Navigate } from 'react-router-dom'

/** Compatibilidad menú legacy: redirige a pestaña Tipos en Archivos. */
export function AdminTiposArchivoPage() {
  return <Navigate to="/admin/archivos?tab=tipos" replace />
}
