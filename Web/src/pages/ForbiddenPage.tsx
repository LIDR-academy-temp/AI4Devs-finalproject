import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <ShieldAlert className="mb-4 h-12 w-12 text-amber-600" aria-hidden="true" />
      <h1 className="mb-2 text-2xl font-semibold text-primary-dark">Acceso no permitido</h1>
      <p className="mb-6 text-muted">
        No tienes permiso para ver esta sección. Si crees que es un error, contacta al administrador del
        condominio.
      </p>
      <Link
        to="/"
        className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
