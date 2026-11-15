import { obtenerModo } from '../servicios/cliente'
import { useCarga } from '../servicios/useCarga'

const TEXTOS: Record<string, string> = {
  simulado: 'Datos simulados: no son mediciones reales de la estación.',
  prueba: 'Modo de prueba: los casos y sus datos no corresponden a estaciones reales.',
}

/** En modo real no muestra nada. */
export function AvisoDeModo() {
  const { datos } = useCarga(() => obtenerModo(), [])
  const texto = datos ? TEXTOS[datos] : undefined
  if (!texto) {
    return null
  }
  return (
    <p role="note" className="aviso-modo">
      {texto}
    </p>
  )
}
