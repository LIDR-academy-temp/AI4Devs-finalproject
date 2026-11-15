import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import App from '../App'
import { ProveedorDeSesion } from '../servicios/sesion'

export interface Simulada {
  estado?: number
  cuerpo?: unknown
}

/** La función recibe el cuerpo JSON enviado, si lo hay. */
export type Rutas = Record<string, Simulada | ((cuerpo: unknown) => Simulada | Promise<Simulada>)>

export const ESTACION = {
  id: 1,
  nombre: 'Estación Norte',
  latitud: '-34',
  longitud: '-60',
  activa: true,
  inactiva_desde: null,
}
export const OTRA = { ...ESTACION, id: 2, nombre: 'Estación Sur', latitud: '-35', longitud: '-61' }
export const INACTIVA = {
  ...ESTACION,
  id: 3,
  nombre: 'Estación Oeste',
  activa: false,
  inactiva_desde: '2026-10-30T09:00:00-03:00',
}
export const NO_AUTENTICADO = {
  estado: 401,
  cuerpo: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión ausente o vencida.' },
}

export const AVISO =
  'Recomendación orientativa. No reemplaza el criterio profesional ni la etiqueta del producto.'

export const RECOMENDACION = {
  estacion_id: 1,
  estado: 'APTO',
  indice: 10,
  delta_t_c: -0.1,
  inversion_detectada: false,
  motivos: [{ codigo: 'SIN_INVERSION', detalle: 'La temperatura a 10 m no supera a la de 2 m.' }],
  medido_en: '2026-11-01T22:40:00-03:00',
  antiguedad_segundos: 120,
  version_metodo: 'TIS-1.1',
  aviso: AVISO,
}

export const CONDICIONES = {
  estacion_id: 1,
  estacion_nombre: 'Estación Norte',
  activa: true,
  inactiva_desde: null,
  medido_en: '2026-11-01T22:40:00-03:00',
  antiguedad_segundos: 120,
  estado_datos: 'VIGENTE',
  ultima_ingesta_exitosa_en: '2026-11-01T22:41:00-03:00',
  ultima_ingesta_con_error: false,
  ultimo_intento: { en: '2026-11-01T22:41:00-03:00', resultado: 'EXITO' },
  salud: 'EN_VIVO',
  sensores: [
    {
      sensor_id: 6,
      nombre: 'Temp Amb. a 2 Mts',
      magnitud: 'TEMPERATURA',
      altura_m: 2,
      valor: 20.3,
      unidad: '°C',
      calidad: 'OK',
      alarma: false,
    },
    {
      sensor_id: 9,
      nombre: 'Anemómetro',
      magnitud: 'VIENTO_VELOCIDAD',
      altura_m: null,
      valor: null,
      unidad: 'km/h',
      calidad: 'FALTANTE',
      alarma: null,
    },
  ],
}

export function simularApi(rutas: Rutas) {
  const llamadas: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, opciones?: RequestInit) => {
      const clave = `${opciones?.method ?? 'GET'} ${url.split('?')[0].replace('/api/v1', '')}`
      llamadas.push(`${clave}${url.includes('?') ? `?${url.split('?')[1]}` : ''}`)
      const entrada = rutas[clave]
      if (!entrada) {
        throw new TypeError(`Sin respuesta simulada: ${clave}`)
      }
      const enviado: unknown = typeof opciones?.body === 'string' ? JSON.parse(opciones.body) : undefined
      const { estado = 200, cuerpo } = typeof entrada === 'function' ? await entrada(enviado) : entrada
      return new Response(estado === 204 ? null : JSON.stringify(cuerpo), { status: estado })
    }),
  )
  return llamadas
}

export function abrir(ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorDeSesion>
        <App />
      </ProveedorDeSesion>
    </MemoryRouter>,
  )
}
