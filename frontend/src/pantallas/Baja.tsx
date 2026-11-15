import { useState } from 'react'
import { Link } from 'react-router'
import { PaginaPublica } from '../componentes/PaginaPublica'
import { darDeBajaConEnlace, mensajeDeError } from '../servicios/cliente'
import { useCodigoDelEnlace } from '../servicios/enlace'
import { useSesion } from '../servicios/sesion'

/**
 * Baja desde el enlace de un correo. Abrir la página nunca borra nada: los programas que revisan
 * los enlaces de los correos podrían abrirla. Hace falta tocar el botón.
 */
export function Baja() {
  const codigo = useCodigoDelEnlace()
  const { estado: estadoDeSesion, terminar } = useSesion()
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    codigo ? null : 'El enlace está incompleto. Ábralo directamente desde el correo.',
  )
  const [enviando, setEnviando] = useState(false)

  async function confirmar() {
    setError(null)
    setEnviando(true)
    try {
      const { mensaje } = await darDeBajaConEnlace(codigo ?? '')
      setAviso(mensaje)
      if (estadoDeSesion === 'activa') {
        terminar(mensaje)
      }
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    } finally {
      setEnviando(false)
    }
  }

  if (aviso) {
    return (
      <PaginaPublica titulo="Baja realizada">
        <p role="status" className="aviso">
          {aviso}
        </p>
        <p>
          Si quiere volver a usar Weather Track, puede <Link to="/registro">crear una cuenta nueva</Link>.
        </p>
      </PaginaPublica>
    )
  }
  return (
    <PaginaPublica titulo="Darse de baja">
      <p>
        Se borrarán su cuenta y todos sus datos: nombre, correo, datos de contacto y preferencias. No se
        puede deshacer.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {codigo && (
        <button type="button" className="peligro" disabled={enviando} onClick={() => void confirmar()}>
          {enviando ? 'Borrando…' : 'Borrar mi cuenta y mis datos'}
        </button>
      )}
      <p>
        <Link to="/acceso">No, volver</Link>
      </p>
    </PaginaPublica>
  )
}
