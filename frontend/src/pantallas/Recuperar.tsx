import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Campo } from '../componentes/Campo'
import { PaginaPublica } from '../componentes/PaginaPublica'
import { erroresDeCampos, mensajeDeError, pedirRecupero } from '../servicios/cliente'

export function Recuperar() {
  const [email, setEmail] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setCampos({})
    setEnviando(true)
    try {
      setAviso((await pedirRecupero(email)).mensaje)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
      setCampos(erroresDeCampos(fallo))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PaginaPublica titulo="Recuperar el acceso">
      {aviso ? (
        <>
          <p role="status" className="aviso">
            {aviso}
          </p>
          <p className="secundario">El enlace vale 30 minutos. Si no llega, revise el correo no deseado.</p>
        </>
      ) : (
        <>
          <p className="secundario">
            Su usuario es el correo con el que se registró. Si no recuerda cuál fue, pida el enlace para
            cada correo que crea haber usado.
          </p>
          <form onSubmit={(evento) => void enviar(evento)} className="tarjeta formulario">
            <Campo
              etiqueta="Correo"
              type="email"
              autoComplete="username"
              required
              value={email}
              error={campos.email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviarme un enlace'}
            </button>
          </form>
        </>
      )}
      <p>
        <Link to="/acceso">Volver al ingreso</Link>
      </p>
    </PaginaPublica>
  )
}
