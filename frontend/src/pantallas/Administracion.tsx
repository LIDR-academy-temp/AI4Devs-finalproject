import { useState } from 'react'
import type { FormEvent } from 'react'
import { Campo } from '../componentes/Campo'
import {
  erroresDeCampos,
  guardarConfiguracionSat2,
  mensajeDeError,
  obtenerConfiguracionSat2,
} from '../servicios/cliente'
import type { EstadoConfiguracionSat2 } from '../servicios/cliente'
import { formatearMomentoDeArgentina } from '../servicios/serie'
import { useCarga } from '../servicios/useCarga'

const RESULTADOS: Record<string, string> = {
  EXITO: 'terminó bien',
  PARCIAL: 'terminó con datos parciales',
  ERROR: 'terminó con error',
}

function Conexion({ estado }: { estado: EstadoConfiguracionSat2 }) {
  const { ultimo_ciclo: ciclo } = estado
  return (
    <section className="tarjeta" aria-labelledby="titulo-conexion">
      <h3 id="titulo-conexion">Conexión con SAT2</h3>
      {estado.configuracion_guardada && estado.cargada_en ? (
        <p>
          Cargada el {formatearMomentoDeArgentina(estado.cargada_en)} por{' '}
          {estado.cargada_por ?? 'una cuenta que ya no existe'}.
          {estado.modo === 'real' && ' La ingesta usa esta configuración.'}
        </p>
      ) : (
        <p>No hay una configuración guardada: en modo real, la ingesta usa las variables del servidor.</p>
      )}
      <p>
        {ciclo
          ? `Último ciclo: ${RESULTADOS[ciclo.resultado] ?? ciclo.resultado} el ${formatearMomentoDeArgentina(ciclo.finalizado_en)}.`
          : 'Todavía no hay ciclos de ingesta.'}
      </p>
      {estado.modo !== 'real' && (
        <p className="secundario">
          El modo actual, {estado.modo}, no consulta SAT2: lo que guarde se usará cuando el servidor
          funcione en modo real.
        </p>
      )}
      {!estado.puede_guardar && (
        <p role="alert" className="error">
          Falta configurar en el servidor la clave para guardar la configuración (SAT2_CLAVE_PUBLICA).
          Está explicado en la guía de instalación.
        </p>
      )}
    </section>
  )
}

const VACIO = { url_base: '', usuario: '', clave: '', contrasena_actual: '' }

function Formulario({
  puedeGuardar,
  modoReal,
  alGuardar,
}: {
  puedeGuardar: boolean
  modoReal: boolean
  alGuardar: (estado: EstadoConfiguracionSat2) => void
}) {
  const [datos, setDatos] = useState(VACIO)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const sinCifrado = datos.url_base.trim().toLowerCase().startsWith('http://')

  function campo(nombre: keyof typeof VACIO) {
    return {
      value: datos[nombre],
      error: campos[nombre],
      onChange: (evento: { target: { value: string } }) =>
        setDatos((anteriores) => ({ ...anteriores, [nombre]: evento.target.value })),
    }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setAviso(null)
    setError(null)
    setCampos({})
    setEnviando(true)
    try {
      alGuardar(await guardarConfiguracionSat2(datos))
      setDatos(VACIO)
      setAviso(
        modoReal
          ? 'Configuración guardada. La ingesta la usa desde el próximo ciclo, en hasta 10 minutos.'
          : 'Configuración guardada. Se usará cuando el servidor funcione en modo real.',
      )
    } catch (fallo) {
      setError(mensajeDeError(fallo))
      setCampos(erroresDeCampos(fallo))
      setDatos((anteriores) => ({ ...anteriores, contrasena_actual: '' }))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={(evento) => void guardar(evento)}
      className="tarjeta formulario"
      aria-labelledby="titulo-reemplazar"
    >
      <h3 id="titulo-reemplazar">Reemplazar la configuración</h3>
      <p className="secundario">
        Se reemplazan los tres datos juntos. Por seguridad, esta pantalla nunca muestra los guardados, y
        cada cambio se avisa por correo a los administradores.
      </p>
      <Campo
        etiqueta="Dirección de SAT2"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        required
        maxLength={500}
        ayuda={
          sinCifrado ? (
            <span className="ayuda-advertencia">
              Atención: con http:// las credenciales viajarían sin cifrar hasta SAT2.
            </span>
          ) : (
            'La dirección base de la API, con https://.'
          )
        }
        {...campo('url_base')}
      />
      <Campo etiqueta="Usuario de SAT2" autoComplete="off" spellCheck={false} required maxLength={200} {...campo('usuario')} />
      <Campo
        etiqueta="Contraseña de SAT2"
        type="password"
        autoComplete="new-password"
        required
        maxLength={1024}
        {...campo('clave')}
      />
      <Campo
        etiqueta="Su contraseña de Weather Track"
        type="password"
        autoComplete="current-password"
        required
        maxLength={1024}
        ayuda="Para confirmar que es usted."
        {...campo('contrasena_actual')}
      />
      {aviso && (
        <p role="status" className="aviso">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" disabled={!puedeGuardar || enviando}>
        {enviando ? 'Guardando…' : 'Guardar la configuración'}
      </button>
    </form>
  )
}

function Cambios({ estado }: { estado: EstadoConfiguracionSat2 }) {
  return (
    <section className="tarjeta" aria-labelledby="titulo-cambios">
      <h3 id="titulo-cambios">Últimos cambios</h3>
      {estado.cambios.length ? (
        <ul>
          {estado.cambios.map((cambio) => (
            <li key={`${cambio.ocurrido_en}-${cambio.email}`}>
              {formatearMomentoDeArgentina(cambio.ocurrido_en)}, {cambio.email}
            </li>
          ))}
        </ul>
      ) : (
        <p>Todavía no hay cambios.</p>
      )}
    </section>
  )
}

export function Administracion() {
  const carga = useCarga(() => obtenerConfiguracionSat2(), [])
  const [guardado, setGuardado] = useState<EstadoConfiguracionSat2 | null>(null)
  const estado = guardado ?? carga.datos

  if (carga.cargando && !estado) {
    return <p role="status">Cargando la administración…</p>
  }
  if (!estado) {
    return (
      <p role="alert" className="error">
        {carga.error}
      </p>
    )
  }
  return (
    <section className="cuenta">
      <h2>Administración</h2>
      <p className="secundario">
        Solo los administradores ven esta pantalla. Acá se carga la conexión con SAT2, de donde llegan las
        lecturas de las estaciones.
      </p>
      <Conexion estado={estado} />
      <Formulario puedeGuardar={estado.puede_guardar} modoReal={estado.modo === 'real'} alGuardar={setGuardado} />
      <Cambios estado={estado} />
    </section>
  )
}
