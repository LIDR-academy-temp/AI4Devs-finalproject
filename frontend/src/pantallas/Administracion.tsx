import { useState } from 'react'
import type { FormEvent } from 'react'
import { Campo } from '../componentes/Campo'
import {
  erroresDeCampos,
  guardarConfiguracionSat2,
  mensajeDeError,
  obtenerConfiguracionSat2,
  obtenerEstadoSistema,
} from '../servicios/cliente'
import type { EstadoConfiguracionSat2, EstadoSistema as Estado } from '../servicios/cliente'
import { formatearMomentoDeArgentina } from '../servicios/serie'
import { useCarga } from '../servicios/useCarga'

const RESULTADOS: Record<string, string> = {
  EXITO: 'terminó bien',
  PARCIAL: 'terminó con datos parciales',
  ERROR: 'terminó con error',
}

/** Los mismos nombres que usan los correos de alerta. */
function nombreDelControl(tipo: string, objeto: string): string {
  switch (tipo) {
    case 'DATOS_VIEJOS':
      return `Datos viejos en ${objeto}`
    case 'CICLOS_FALLIDOS':
      return `Ciclos con error en ${objeto}`
    case 'DISCO_CASI_LLENO':
      return 'Disco de la base'
    default:
      return 'Accesos por fuerza bruta'
  }
}

function megabytes(bytes: number): string {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(bytes / 1_048_576)} MB`
}

function textoDelWorker(worker: Estado['worker']): string {
  if (worker.estado === 'MODO_PRUEBA') {
    return 'Proceso de ingesta: en modo prueba no ejecuta ciclos.'
  }
  if (!worker.ultimo_ciclo_en) {
    return 'Proceso de ingesta: sin actividad, todavía no ejecutó ningún ciclo.'
  }
  const momento = formatearMomentoDeArgentina(worker.ultimo_ciclo_en)
  return worker.estado === 'ACTIVO'
    ? `Proceso de ingesta: activo, último ciclo el ${momento}.`
    : `Proceso de ingesta: sin actividad desde el ${momento}.`
}

function EstadoDelSistema() {
  const { datos, error, cargando } = useCarga(() => obtenerEstadoSistema(), [])
  return (
    <section className="tarjeta" aria-labelledby="titulo-estado">
      <h3 id="titulo-estado">Estado del sistema</h3>
      {cargando && !datos && <p role="status">Revisando el estado…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {datos && (
        <>
          <ul aria-label="Controles" className="controles">
            {datos.controles.map((control) => (
              <li
                key={`${control.tipo}-${control.objeto}`}
                className={control.estado === 'ALERTA' ? 'control-alerta' : 'control-bien'}
              >
                <strong>
                  {nombreDelControl(control.tipo, control.objeto)}: {control.estado === 'ALERTA' ? 'en alerta' : 'bien'}.
                </strong>{' '}
                {control.detalle}
              </li>
            ))}
          </ul>
          <p>{textoDelWorker(datos.worker)}</p>
          <p className="secundario">Tamaño de la base: {megabytes(datos.base_tamano_bytes)}.</p>
          <h4>Últimas alertas</h4>
          {datos.alertas.length ? (
            <ul aria-label="Últimas alertas">
              {datos.alertas.map((alerta) => (
                <li key={`${alerta.tipo}-${alerta.objeto}-${alerta.abierta_en}`}>
                  {nombreDelControl(alerta.tipo, alerta.objeto)},{' '}
                  {alerta.cerrada_en
                    ? `del ${formatearMomentoDeArgentina(alerta.abierta_en)} al ${formatearMomentoDeArgentina(alerta.cerrada_en)}.`
                    : `desde el ${formatearMomentoDeArgentina(alerta.abierta_en)}, sigue abierta.`}{' '}
                  {alerta.detalle}
                </li>
              ))}
            </ul>
          ) : (
            <p>Todavía no hubo alertas.</p>
          )}
        </>
      )}
    </section>
  )
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
      <EstadoDelSistema />
      <Conexion estado={estado} />
      <Formulario puedeGuardar={estado.puede_guardar} modoReal={estado.modo === 'real'} alGuardar={setGuardado} />
      <Cambios estado={estado} />
    </section>
  )
}
