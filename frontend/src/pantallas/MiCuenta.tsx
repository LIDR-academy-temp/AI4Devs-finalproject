import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Campo } from '../componentes/Campo'
import {
  actualizarCuenta,
  cambiarContrasena,
  darDeBaja,
  erroresDeCampos,
  mensajeDeError,
  obtenerCuenta,
} from '../servicios/cliente'
import type { Cuenta } from '../servicios/cliente'
import { AYUDA_CONTRASENA, PROVINCIAS } from '../servicios/formularios'
import { useSesion } from '../servicios/sesion'
import { useCarga } from '../servicios/useCarga'

interface Resultado {
  aviso?: string
  error?: string
  campos?: Record<string, string>
}

function Mensajes({ resultado }: { resultado: Resultado }) {
  return (
    <>
      {resultado.aviso && (
        <p role="status" className="aviso">
          {resultado.aviso}
        </p>
      )}
      {resultado.error && (
        <p role="alert" className="error">
          {resultado.error}
        </p>
      )}
    </>
  )
}

function Datos({ cuenta }: { cuenta: Cuenta }) {
  const [datos, setDatos] = useState({
    nombre: cuenta.nombre,
    apellido: cuenta.apellido ?? '',
    localidad: cuenta.localidad ?? '',
    provincia: cuenta.provincia ?? '',
    organizacion: cuenta.organizacion ?? '',
    telefono: cuenta.telefono ?? '',
  })
  const [novedades, setNovedades] = useState(cuenta.acepta_novedades)
  const [resultado, setResultado] = useState<Resultado>({})
  const [enviando, setEnviando] = useState(false)

  function campo(nombre: keyof typeof datos) {
    return {
      value: datos[nombre],
      error: resultado.campos?.[nombre],
      onChange: (evento: { target: { value: string } }) =>
        setDatos((anteriores) => ({ ...anteriores, [nombre]: evento.target.value })),
    }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setResultado({})
    setEnviando(true)
    try {
      await actualizarCuenta({
        ...datos,
        organizacion: datos.organizacion || null,
        telefono: datos.telefono || null,
        acepta_novedades: novedades,
      })
      setResultado({ aviso: 'Datos guardados.' })
    } catch (fallo) {
      setResultado({ error: mensajeDeError(fallo), campos: erroresDeCampos(fallo) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={(evento) => void guardar(evento)} className="tarjeta formulario" aria-labelledby="titulo-datos">
      <h3 id="titulo-datos">Datos</h3>
      <p>
        <span className="etiqueta">Correo</span>
        {cuenta.email}
        <span className="ayuda"> Es su usuario y no se puede cambiar.</span>
      </p>
      <Campo etiqueta="Nombre" autoComplete="given-name" required maxLength={120} {...campo('nombre')} />
      <Campo etiqueta="Apellido" autoComplete="family-name" required maxLength={120} {...campo('apellido')} />
      <Campo etiqueta="Localidad" autoComplete="address-level2" required maxLength={120} {...campo('localidad')} />
      <div className="campo">
        <label htmlFor="cuenta-provincia">Provincia</label>
        <select
          id="cuenta-provincia"
          required
          value={datos.provincia}
          aria-invalid={resultado.campos?.provincia ? true : undefined}
          aria-describedby={resultado.campos?.provincia ? 'cuenta-provincia-error' : undefined}
          onChange={(evento) => setDatos((anteriores) => ({ ...anteriores, provincia: evento.target.value }))}
        >
          <option value="">Elegir…</option>
          {PROVINCIAS.map((provincia) => (
            <option key={provincia}>{provincia}</option>
          ))}
        </select>
        {resultado.campos?.provincia && (
          <span id="cuenta-provincia-error" className="error-campo">
            {resultado.campos.provincia}
          </span>
        )}
      </div>
      <Campo etiqueta="Organización o establecimiento (opcional)" maxLength={160} {...campo('organizacion')} />
      <Campo etiqueta="Teléfono (opcional)" type="tel" maxLength={40} {...campo('telefono')} />
      <label className="casilla">
        <input type="checkbox" checked={novedades} onChange={(evento) => setNovedades(evento.target.checked)} />
        <span>Quiero recibir novedades de Weather Track.</span>
      </label>
      <Mensajes resultado={resultado} />
      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar los datos'}
      </button>
    </form>
  )
}

function Contrasena() {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [resultado, setResultado] = useState<Resultado>({})
  const [enviando, setEnviando] = useState(false)

  async function cambiar(evento: FormEvent) {
    evento.preventDefault()
    setResultado({})
    if (nueva !== repetida) {
      setResultado({ campos: { repetida: 'Las dos contraseñas no coinciden.' } })
      return
    }
    setEnviando(true)
    try {
      await cambiarContrasena(actual, nueva)
      setResultado({ aviso: 'Contraseña cambiada. Se cerraron sus otras sesiones y le avisamos por correo.' })
    } catch (fallo) {
      setResultado({ error: mensajeDeError(fallo), campos: erroresDeCampos(fallo) })
    } finally {
      setActual('')
      setNueva('')
      setRepetida('')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={(evento) => void cambiar(evento)} className="tarjeta formulario" aria-labelledby="titulo-contrasena">
      <h3 id="titulo-contrasena">Contraseña</h3>
      <Campo
        etiqueta="Contraseña actual"
        type="password"
        autoComplete="current-password"
        required
        value={actual}
        error={resultado.campos?.actual}
        onChange={(evento) => setActual(evento.target.value)}
      />
      <Campo
        etiqueta="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        required
        minLength={15}
        maxLength={128}
        ayuda={AYUDA_CONTRASENA}
        value={nueva}
        error={resultado.campos?.nueva}
        onChange={(evento) => setNueva(evento.target.value)}
      />
      <Campo
        etiqueta="Repetir la contraseña nueva"
        type="password"
        autoComplete="new-password"
        required
        maxLength={128}
        value={repetida}
        error={resultado.campos?.repetida}
        onChange={(evento) => setRepetida(evento.target.value)}
      />
      <Mensajes resultado={resultado} />
      <button type="submit" disabled={enviando}>
        {enviando ? 'Cambiando…' : 'Cambiar la contraseña'}
      </button>
    </form>
  )
}

function DarseDeBaja() {
  const { terminar } = useSesion()
  const [contrasena, setContrasena] = useState('')
  const [resultado, setResultado] = useState<Resultado>({})
  const [enviando, setEnviando] = useState(false)

  async function borrar(evento: FormEvent) {
    evento.preventDefault()
    setResultado({})
    setEnviando(true)
    try {
      await darDeBaja(contrasena)
      terminar('Su cuenta y todos sus datos se borraron.')
    } catch (fallo) {
      setResultado({ error: mensajeDeError(fallo), campos: erroresDeCampos(fallo) })
      setContrasena('')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={(evento) => void borrar(evento)} className="tarjeta formulario" aria-labelledby="titulo-baja">
      <h3 id="titulo-baja">Darse de baja</h3>
      <p>Se borran su cuenta y todos sus datos. No se puede deshacer.</p>
      <Campo
        etiqueta="Contraseña, para confirmar"
        type="password"
        autoComplete="current-password"
        required
        value={contrasena}
        error={resultado.campos?.contrasena}
        onChange={(evento) => setContrasena(evento.target.value)}
      />
      <Mensajes resultado={resultado} />
      <button type="submit" className="peligro" disabled={enviando}>
        {enviando ? 'Borrando…' : 'Borrar mi cuenta y mis datos'}
      </button>
    </form>
  )
}

export function MiCuenta() {
  const { datos, error, cargando } = useCarga(() => obtenerCuenta(), [])

  if (cargando) {
    return <p role="status">Cargando la cuenta…</p>
  }
  if (!datos) {
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  }
  return (
    <section className="cuenta">
      <h2>Mi cuenta</h2>
      <p className="secundario">
        Sus datos se usan para darle acceso y para contactarlo por el servicio de Weather Track. Puede
        corregirlos o borrarlos acá. Más detalles en la <Link to="/privacidad">política de privacidad</Link>.
      </p>
      <Datos cuenta={datos} />
      <Contrasena />
      <DarseDeBaja />
    </section>
  )
}
