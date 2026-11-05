import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Campo } from '../componentes/Campo'
import { PaginaPublica } from '../componentes/PaginaPublica'
import { ReenvioConfirmacion } from '../componentes/ReenvioConfirmacion'
import { erroresDeCampos, mensajeDeError, registrarCuenta } from '../servicios/cliente'
import { AYUDA_CONTRASENA, PROVINCIAS } from '../servicios/formularios'

const VACIO = {
  nombre: '',
  apellido: '',
  email: '',
  contrasena: '',
  localidad: '',
  provincia: '',
  organizacion: '',
  telefono: '',
}

export function Registro() {
  const [datos, setDatos] = useState(VACIO)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaNovedades, setAceptaNovedades] = useState(false)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function campo(nombre: keyof typeof VACIO) {
    return {
      value: datos[nombre],
      error: campos[nombre],
      onChange: (evento: { target: { value: string } }) =>
        setDatos((anteriores) => ({ ...anteriores, [nombre]: evento.target.value })),
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setCampos({})
    setEnviando(true)
    try {
      const respuesta = await registrarCuenta({
        ...datos,
        organizacion: datos.organizacion || null,
        telefono: datos.telefono || null,
        acepta_terminos: aceptaTerminos,
        acepta_novedades: aceptaNovedades,
      })
      setAviso(respuesta.mensaje)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
      setCampos(erroresDeCampos(fallo))
      setDatos((anteriores) => ({ ...anteriores, contrasena: '' }))
    } finally {
      setEnviando(false)
    }
  }

  if (aviso) {
    return (
      <PaginaPublica titulo="Revise su correo">
        <p role="status" className="aviso">
          {aviso}
        </p>
        <p>
          El enlace vale 48 horas. Si no confirma la cuenta a tiempo, se borra con todos sus datos.
        </p>
        <h2>¿No llegó el correo?</h2>
        <p className="secundario">Revise la carpeta de correo no deseado o pida otro enlace.</p>
        <ReenvioConfirmacion correoInicial={datos.email} />
        <p>
          <Link to="/acceso">Volver al ingreso</Link>
        </p>
      </PaginaPublica>
    )
  }

  return (
    <PaginaPublica titulo="Crear una cuenta" amplia>
      <p className="secundario">
        Con su cuenta consulta las recomendaciones de aplicación de las estaciones de Weather Track.
      </p>
      <form onSubmit={(evento) => void enviar(evento)} className="tarjeta formulario" noValidate>
        <Campo etiqueta="Nombre" autoComplete="given-name" required maxLength={120} {...campo('nombre')} />
        <Campo etiqueta="Apellido" autoComplete="family-name" required maxLength={120} {...campo('apellido')} />
        <Campo etiqueta="Correo" type="email" autoComplete="email" required maxLength={254} {...campo('email')} />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={128}
          ayuda={AYUDA_CONTRASENA}
          {...campo('contrasena')}
        />
        <Campo etiqueta="Localidad" autoComplete="address-level2" required maxLength={120} {...campo('localidad')} />
        <div className="campo">
          <label htmlFor="registro-provincia">Provincia</label>
          <select
            id="registro-provincia"
            required
            value={datos.provincia}
            aria-invalid={campos.provincia ? true : undefined}
            aria-describedby={campos.provincia ? 'registro-provincia-error' : undefined}
            onChange={(evento) => setDatos((anteriores) => ({ ...anteriores, provincia: evento.target.value }))}
          >
            <option value="">Elegir…</option>
            {PROVINCIAS.map((provincia) => (
              <option key={provincia}>{provincia}</option>
            ))}
          </select>
          {campos.provincia && (
            <span id="registro-provincia-error" className="error-campo">
              {campos.provincia}
            </span>
          )}
        </div>
        <Campo
          etiqueta="Organización o establecimiento (opcional)"
          autoComplete="organization"
          maxLength={160}
          {...campo('organizacion')}
        />
        <Campo etiqueta="Teléfono (opcional)" type="tel" autoComplete="tel" maxLength={40} {...campo('telefono')} />

        <p className="secundario">
          Sus datos se usan para darle acceso y para contactarlo por el servicio de Weather Track. Puede
          consultarlos, corregirlos o borrarlos desde «Mi cuenta». Más detalles en la{' '}
          <Link to="/privacidad">política de privacidad</Link>.
        </p>
        <label className="casilla">
          <input
            type="checkbox"
            checked={aceptaTerminos}
            aria-invalid={campos.acepta_terminos ? true : undefined}
            aria-describedby={campos.acepta_terminos ? 'registro-terminos-error' : undefined}
            onChange={(evento) => setAceptaTerminos(evento.target.checked)}
          />
          <span>
            Acepto los <Link to="/terminos">términos de uso</Link> y la{' '}
            <Link to="/privacidad">política de privacidad</Link>.
          </span>
        </label>
        {campos.acepta_terminos && (
          <span id="registro-terminos-error" className="error-campo">
            {campos.acepta_terminos}
          </span>
        )}
        <label className="casilla">
          <input
            type="checkbox"
            checked={aceptaNovedades}
            onChange={(evento) => setAceptaNovedades(evento.target.checked)}
          />
          <span>Quiero recibir novedades de Weather Track (opcional).</span>
        </label>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Creando la cuenta…' : 'Crear la cuenta'}
        </button>
      </form>
      <p>
        ¿Ya tiene una cuenta? <Link to="/acceso">Ingresar</Link>
      </p>
    </PaginaPublica>
  )
}
