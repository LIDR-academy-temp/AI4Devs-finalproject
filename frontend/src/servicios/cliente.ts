/** Cliente de la API. Los tipos se generan del contrato: ver `npm run generar:tipos`. */
import type { components } from './api-tipos'

export type Recomendacion = components['schemas']['Recomendacion']
export type CondicionesActuales = components['schemas']['CondicionesActuales']
export type LecturaSensor = components['schemas']['LecturaSensor']
export type Historico = components['schemas']['Historico']
export type Punto = components['schemas']['Punto']
export type Estacion = components['schemas']['EstacionResumen']
export type UsuarioPublico = components['schemas']['UsuarioPublico']

const BASE = '/api/v1'
const NO_AUTENTICADO = 401

export class ErrorDeApi extends Error {
  readonly estado: number
  readonly codigo: string

  constructor(estado: number, codigo: string, mensaje: string) {
    super(mensaje)
    this.estado = estado
    this.codigo = codigo
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
  metodo?: 'GET' | 'POST'
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
    const error = (datos ?? {}) as { codigo?: string; mensaje?: string }
    throw new ErrorDeApi(
      respuesta.status,
      error.codigo ?? 'ERROR',
      error.mensaje ?? 'Ocurrió un error inesperado.',
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

export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorDeApi || error instanceof ErrorDeRed) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}
