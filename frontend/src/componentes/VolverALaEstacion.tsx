import { Link } from 'react-router'
import { useUltimaEstacion } from '../servicios/estaciones'

/** Vuelve a la última estación que se vio; si no se vio ninguna, al inicio, que abre la primera. */
export function VolverALaEstacion() {
  const { ultima } = useUltimaEstacion()
  return (
    <Link to={ultima ? `/estaciones/${encodeURIComponent(ultima)}` : '/'} className="volver">
      ← Volver a la estación
    </Link>
  )
}
