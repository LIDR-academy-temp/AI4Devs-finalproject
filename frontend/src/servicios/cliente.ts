/** Cliente de la API. Los tipos se generan del contrato: ver `npm run generar:tipos`. */
import type { components } from './api-tipos'

export type Recomendacion = components['schemas']['Recomendacion']
export type CondicionesActuales = components['schemas']['CondicionesActuales']
export type LecturaSensor = components['schemas']['LecturaSensor']
export type Historico = components['schemas']['Historico']
export type Punto = components['schemas']['Punto']
export type Estacion = components['schemas']['EstacionResumen']
export type UsuarioPublico = components['schemas']['UsuarioPublico']
export type SolicitudRegistro = components['schemas']['SolicitudRegistro']
export type Cuenta = components['schemas']['Cuenta']
export type DatosPersonales = components['schemas']['DatosPersonales']
export type Aviso = components['schemas']['Aviso']
export type EstadoConfiguracionSat2 = components['schemas']['EstadoConfiguracionSat2']
export type SolicitudConfiguracionSat2 = components['schemas']['SolicitudConfiguracionSat2']
export type EstadoSistema = components['schemas']['EstadoSistema']

const BASE = '/api/v1'
const NO_AUTENTICADO = 401

export class ErrorDeApi extends Error {
  readonly estado: number
  readonly codigo: string
  /** Campo del formulario: mensaje para mostrar junto a él. */
  readonly campos: Record<string, string>

  constructor(estado: number, codigo: string, mensaje: string, campos: Record<string, string> = {}) {
    super(mensaje)
    this.estado = estado
    this.codigo = codigo
    this.campos = campos
  }
}

export class ErrorDeRed extends Error {
  constructor() {
    super('No hay conexión con el servidor.')
  }
}

let alVencerSesion: () => void = () => undefined

export function registrarAlVencerSesion(accion: () => void): void {
  alVencerSesion = accion
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT'
  cuerpo?: unknown
  /** Un 401 es un resultado esperado, no una sesión que venció. */
  sinAvisoDeVencimiento?: boolean
}

async function pedir<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      credentials: 'same-origin',
      headers: opciones.cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    })
  } catch {
    throw new ErrorDeRed()
  }
  if (respuesta.status === 204) {
    return undefined as T
  }
  const datos: unknown = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    if (respuesta.status === NO_AUTENTICADO && !opciones.sinAvisoDeVencimiento) {
      alVencerSesion()
    }
    const error = (datos ?? {}) as {
      codigo?: string
      mensaje?: string
      campos?: Record<string, string>
    }
    throw new ErrorDeApi(
      respuesta.status,
      error.codigo ?? 'ERROR',
      error.mensaje ?? 'Ocurrió un error inesperado.',
      error.campos ?? {},
    )
  }
  return datos as T
}

export function iniciarSesion(email: string, contrasena: string): Promise<UsuarioPublico> {
  return pedir('/auth/login', {
    metodo: 'POST',
    cuerpo: { email, contrasena },
    sinAvisoDeVencimiento: true,
  })
}

export function cerrarSesion(): Promise<void> {
  return pedir('/auth/logout', { metodo: 'POST' })
}

/** El modo de datos que informa la ruta de salud: real, simulado o prueba. */
export async function obtenerModo(): Promise<string> {
  const salud = await pedir<Record<string, string>>('/salud', { sinAvisoDeVencimiento: true })
  return salud.modo ?? 'desconocido'
}

export function listarEstaciones(sinAvisoDeVencimiento = false): Promise<Estacion[]> {
  return pedir('/estaciones', { sinAvisoDeVencimiento })
}

export function obtenerCondiciones(estacionId: string): Promise<CondicionesActuales> {
  return pedir(`/estaciones/${encodeURIComponent(estacionId)}/condiciones-actuales`)
}

export function obtenerRecomendacion(estacionId: string): Promise<Recomendacion> {
  return pedir(`/estaciones/${encodeURIComponent(estacionId)}/recomendacion`)
}

export function obtenerHistorico(
  estacionId: string,
  sensorId: string,
  desde: Date,
  hasta: Date,
): Promise<Historico> {
  const consulta = new URLSearchParams({
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
  })
  return pedir(
    `/estaciones/${encodeURIComponent(estacionId)}/sensores/${encodeURIComponent(sensorId)}/historico?${consulta}`,
  )
}

// Registro, confirmación, recupero y bajas por enlace: no usan sesión.
const PUBLICA = { sinAvisoDeVencimiento: true }

export function registrarCuenta(datos: SolicitudRegistro): Promise<Aviso> {
  return pedir('/auth/registro', { metodo: 'POST', cuerpo: datos, ...PUBLICA })
}

export function confirmarCuenta(codigo: string): Promise<Aviso> {
  return pedir('/auth/confirmacion', { metodo: 'POST', cuerpo: { codigo }, ...PUBLICA })
}

export function reenviarConfirmacion(email: string): Promise<Aviso> {
  return pedir('/auth/confirmacion/reenvio', { metodo: 'POST', cuerpo: { email }, ...PUBLICA })
}

export function pedirRecupero(email: string): Promise<Aviso> {
  return pedir('/auth/recupero', { metodo: 'POST', cuerpo: { email }, ...PUBLICA })
}

export function elegirNuevaContrasena(codigo: string, contrasena: string): Promise<Aviso> {
  return pedir('/auth/recupero/nueva-contrasena', {
    metodo: 'POST',
    cuerpo: { codigo, contrasena },
    ...PUBLICA,
  })
}

export function darDeBajaConEnlace(codigo: string): Promise<Aviso> {
  return pedir('/cuenta/baja-con-enlace', { metodo: 'POST', cuerpo: { codigo }, ...PUBLICA })
}

export function obtenerCuenta(sinAvisoDeVencimiento = false): Promise<Cuenta> {
  return pedir('/cuenta', { sinAvisoDeVencimiento })
}

export function actualizarCuenta(datos: DatosPersonales): Promise<Cuenta> {
  return pedir('/cuenta', { metodo: 'PUT', cuerpo: datos })
}

export function cambiarContrasena(actual: string, nueva: string): Promise<void> {
  return pedir('/cuenta/contrasena', { metodo: 'POST', cuerpo: { actual, nueva } })
}

export function darDeBaja(contrasena: string): Promise<void> {
  return pedir('/cuenta/baja', { metodo: 'POST', cuerpo: { contrasena } })
}

// Administración: para cualquier cuenta sin el rol, estas rutas no existen (404).

export function obtenerConfiguracionSat2(): Promise<EstadoConfiguracionSat2> {
  return pedir('/administracion/sat2')
}

export function obtenerEstadoSistema(): Promise<EstadoSistema> {
  return pedir('/administracion/estado')
}

export function guardarConfiguracionSat2(datos: SolicitudConfiguracionSat2): Promise<EstadoConfiguracionSat2> {
  return pedir('/administracion/sat2', { metodo: 'PUT', cuerpo: datos })
}

/** Los mensajes por campo de un error de la API, o ninguno. */
export function erroresDeCampos(error: unknown): Record<string, string> {
  return error instanceof ErrorDeApi ? error.campos : {}
}

export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorDeApi || error instanceof ErrorDeRed) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}
