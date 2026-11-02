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

export function rangoDeDias(dias: number, ahora: Date): { desde: Date; hasta: Date } {
  return { desde: new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000), hasta: ahora }
}

export function formatearNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) {
    return '—'
  }
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(valor)
}
