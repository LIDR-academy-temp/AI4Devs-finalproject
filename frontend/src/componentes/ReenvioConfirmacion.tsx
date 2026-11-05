import { useState } from 'react'
import type { FormEvent } from 'react'
import { erroresDeCampos, mensajeDeError, reenviarConfirmacion } from '../servicios/cliente'
import { Campo } from './Campo'

/** Pide otro enlace de confirmación. La respuesta es la misma exista o no la cuenta. */
export function ReenvioConfirmacion({ correoInicial = '' }: { correoInicial?: string }) {
  const [email, setEmail] = useState(correoInicial)
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
      setAviso((await reenviarConfirmacion(email)).mensaje)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
      setCampos(erroresDeCampos(fallo))
    } finally {
      setEnviando(false)
    }
  }

  if (aviso) {
    return (
      <p role="status" className="aviso">
        {aviso}
      </p>
    )
  }
  return (
    <form onSubmit={(evento) => void enviar(evento)} className="tarjeta formulario">
      <Campo
        etiqueta="Correo"
        type="email"
        autoComplete="email"
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
        {enviando ? 'Enviando…' : 'Enviar un enlace nuevo'}
      </button>
    </form>
  )
}
