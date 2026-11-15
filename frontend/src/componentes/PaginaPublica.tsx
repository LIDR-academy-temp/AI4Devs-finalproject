import { Link } from 'react-router'
import type { ReactNode } from 'react'

/** Marco de las pantallas sin sesión: registro, confirmación, recupero, baja y textos legales. */
interface Props {
  titulo: string
  /** Para formularios largos y textos de lectura: la columna angosta del ingreso no alcanza. */
  amplia?: boolean
  children: ReactNode
}

export function PaginaPublica({ titulo, amplia = false, children }: Props) {
  return (
    <main className={amplia ? 'acceso acceso-amplia' : 'acceso'}>
      <p className="marca-publica">
        <Link to="/acceso" className="marca">
          Weather Track
        </Link>
      </p>
      <h1>{titulo}</h1>
      {children}
    </main>
  )
}
