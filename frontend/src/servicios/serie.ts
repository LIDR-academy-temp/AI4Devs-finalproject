import type { Punto } from './cliente'

/** Las mediciones son cada 10 minutos; se admite un margen antes de considerar un hueco. */
const SALTO_MAXIMO_MS = 11 * 60 * 1000

export interface Serie {
  x: string[]
  y: (number | null)[]
}

/** La API responde en hora de Argentina: se muestra esa hora, sin importar el navegador. */
export function horaLocal(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

export function formatearFechaHora(iso: string): string {
  const [fecha, hora] = horaLocal(iso).split(' ')
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio} ${hora}`
}

/**
 * Arma la serie del gráfico sin interpolar. Un registro que nunca llegó no aparece en la
 * respuesta, así que se agrega un valor nulo para que la línea se corte en ese tramo.
 */
export function armarSerie(puntos: Punto[]): Serie {
  const serie: Serie = { x: [], y: [] }
  let anterior: number | null = null
  for (const punto of puntos) {
    const momento = Date.parse(punto.medido_en)
    if (anterior !== null && momento - anterior > SALTO_MAXIMO_MS) {
      serie.x.push(horaLocal(new Date(anterior + 5 * 60 * 1000).toISOString().slice(0, 16)))
      serie.y.push(null)
    }
    serie.x.push(horaLocal(punto.medido_en))
    serie.y.push(punto.valor ?? null)
    anterior = momento
  }
  return serie
}

export function formatearHoraDeArgentina(momento: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(momento)
}

export function rangoDeDias(dias: number, ahora: Date): { desde: Date; hasta: Date } {
  return { desde: new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000), hasta: ahora }
}

export function formatearNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) {
    return '—'
  }
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(valor)
}

const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires'
/** Argentina no usa horario de verano desde 2009: sus fechas se arman con este desfase. */
const DESFASE_ARGENTINA = '-03:00'
/** El mismo máximo que la API (RANGO_MAXIMO): un rango manual abarca hasta 31 días de calendario. */
export const DIAS_MAXIMOS = 31

export interface Rango {
  desde: Date
  hasta: Date
}

/** La fecha `AAAA-MM-DD` de ese momento en Argentina, como la usa `<input type="date">`. */
export function fechaDeArgentina(momento: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_ARGENTINA }).format(momento)
}

/**
 * El mismo día del año anterior, en Argentina: la consulta más vieja que acepta la API
 * (`primer_instante_permitido`). Sin 29 de febrero el año anterior, es el 28.
 */
export function primerDiaPermitido(ahora: Date): string {
  const [anio, mes, dia] = fechaDeArgentina(ahora).split('-')
  const fecha = `${Number(anio) - 1}-${mes}-${dia}`
  return mes === '02' && dia === '29' ? `${Number(anio) - 1}-02-28` : fecha
}

export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function diasEntre(desde: string, hasta: string): number {
  return (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000
}

export type ResultadoRangoManual =
  | { rango: Rango }
  | { campo: 'desde' | 'hasta'; error: string }

/**
 * Valida un rango de fechas de calendario y lo convierte en instantes: desde las 00:00 del
 * primer día hasta las 23:59:59 del último, o hasta ahora si el último es hoy.
 */
export function rangoManual(desde: string, hasta: string, ahora: Date): ResultadoRangoManual {
  const hoy = fechaDeArgentina(ahora)
  if (!desde) {
    return { campo: 'desde', error: 'Elija la fecha de inicio.' }
  }
  if (!hasta) {
    return { campo: 'hasta', error: 'Elija la fecha de fin.' }
  }
  if (desde < primerDiaPermitido(ahora)) {
    return { campo: 'desde', error: 'Se puede consultar hasta un año atrás.' }
  }
  if (hasta > hoy) {
    return { campo: 'hasta', error: 'La fecha de fin no puede ser futura.' }
  }
  if (desde > hoy) {
    return { campo: 'desde', error: 'La fecha de inicio no puede ser futura.' }
  }
  if (hasta < desde) {
    return { campo: 'hasta', error: 'La fecha de fin no puede ser anterior a la de inicio.' }
  }
  if (diasEntre(desde, hasta) + 1 > DIAS_MAXIMOS) {
    return { campo: 'hasta', error: `El rango puede abarcar como máximo ${DIAS_MAXIMOS} días.` }
  }
  return {
    rango: {
      desde: new Date(`${desde}T00:00:00${DESFASE_ARGENTINA}`),
      hasta: hasta === hoy ? ahora : new Date(`${hasta}T23:59:59.999${DESFASE_ARGENTINA}`),
    },
  }
}
