import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Campo } from '../componentes/Campo'
import { PaginaPublica } from '../componentes/PaginaPublica'
import { ErrorDeApi, elegirNuevaContrasena, erroresDeCampos, mensajeDeError } from '../servicios/cliente'
import { useCodigoDelEnlace } from '../servicios/enlace'
import { AYUDA_CONTRASENA } from '../servicios/formularios'

export function Restablecer() {
  const codigo = useCodigoDelEnlace()
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [enlaceInvalido, setEnlaceInvalido] = useState(!codigo)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setCampos({})
    if (contrasena !== repetida) {
      setCampos({ repetida: 'Las dos contraseñas no coinciden.' })
      return
    }
    setEnviando(true)
    try {
      setAviso((await elegirNuevaContrasena(codigo ?? '', contrasena)).mensaje)
    } catch (fallo) {
      if (fallo instanceof ErrorDeApi && fallo.codigo === 'ENLACE_INVALIDO') {
        setEnlaceInvalido(true)
      }
      setError(mensajeDeError(fallo))
      setCampos(erroresDeCampos(fallo))
    } finally {
      setEnviando(false)
    }
  }

  if (aviso) {
    return (
      <PaginaPublica titulo="Contraseña cambiada">
        <p role="status" className="aviso">
          {aviso}
        </p>
        <p className="secundario">Por seguridad, se cerraron las sesiones que tenía abiertas.</p>
        <p>
          <Link to="/acceso">Ingresar</Link>
        </p>
      </PaginaPublica>
    )
  }
  if (enlaceInvalido) {
    return (
      <PaginaPublica titulo="El enlace no sirve">
        <p role="alert" className="error">
          {error ?? 'El enlace está incompleto. Ábralo directamente desde el correo.'}
        </p>
        <p>
          <Link to="/recuperar">Pedir un enlace nuevo</Link>
        </p>
      </PaginaPublica>
    )
  }
  return (
    <PaginaPublica titulo="Elegir una contraseña nueva">
      <form onSubmit={(evento) => void enviar(evento)} className="tarjeta formulario">
        <Campo
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={128}
          ayuda={AYUDA_CONTRASENA}
          value={contrasena}
          error={campos.contrasena}
          onChange={(evento) => setContrasena(evento.target.value)}
        />
        <Campo
          etiqueta="Repetir la contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={repetida}
          error={campos.repetida}
          onChange={(evento) => setRepetida(evento.target.value)}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar la contraseña'}
        </button>
      </form>
    </PaginaPublica>
  )
}
