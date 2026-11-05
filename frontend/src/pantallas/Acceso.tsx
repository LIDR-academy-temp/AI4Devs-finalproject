import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { ErrorDeApi, mensajeDeError } from '../servicios/cliente'
import { useSesion } from '../servicios/sesion'

export function Acceso() {
  const { estado, aviso, ingresar } = useSesion()
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sinConfirmar, setSinConfirmar] = useState(false)
  const [enviando, setEnviando] = useState(false)

  if (estado === 'activa') {
    return <Navigate to="/" replace />
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setSinConfirmar(false)
    setEnviando(true)
    try {
      await ingresar(email, contrasena)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
      setSinConfirmar(fallo instanceof ErrorDeApi && fallo.codigo === 'CUENTA_SIN_CONFIRMAR')
      setContrasena('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="acceso">
      <h1>Weather Track</h1>
      <p className="secundario">¿Puedo aplicar ahora sin riesgo de deriva?</p>
      {aviso && !error && (
        <p role="status" className="aviso">
          {aviso}
        </p>
      )}
      <form onSubmit={(evento) => void enviar(evento)} className="tarjeta formulario">
        <label>
          Correo
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {sinConfirmar && (
          <p>
            <Link to="/reenviar-confirmacion">Volver a enviar el correo de confirmación</Link>
          </p>
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="enlaces-acceso">
          <Link to="/recuperar">¿Olvidó su contraseña?</Link>
        </p>
      </form>
      <p>
        ¿No tiene cuenta? <Link to="/registro">Crear una cuenta</Link>
      </p>
      <p className="secundario pie-legal">
        <Link to="/terminos">Términos de uso</Link> · <Link to="/privacidad">Política de privacidad</Link>
      </p>
    </main>
  )
}
