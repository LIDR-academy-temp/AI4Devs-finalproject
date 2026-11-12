import { useMatch, useNavigate } from 'react-router'
import { nombreEnSelector, useEstaciones } from '../servicios/estaciones'

/** Siempre visible, aunque haya una sola estación: una estación es un equipo de SAT2. */
export function SelectorEstacion() {
  const { datos } = useEstaciones()
  const ruta = useMatch('/estaciones/:estacionId/*')
  const navegar = useNavigate()
  if (!datos || datos.length === 0) {
    return null
  }
  const elegida = ruta?.params.estacionId ?? ''
  const valor = datos.some((e) => String(e.id) === elegida) ? elegida : ''

  return (
    <label className="selector">
      <span>Estación</span>
      <select value={valor} onChange={(evento) => void navegar(`/estaciones/${evento.target.value}`)}>
        {valor === '' && (
          <option value="" disabled>
            Elegir…
          </option>
        )}
        {datos.map((estacion) => (
          <option key={estacion.id} value={String(estacion.id)}>
            {nombreEnSelector(estacion)}
          </option>
        ))}
      </select>
    </label>
  )
}
