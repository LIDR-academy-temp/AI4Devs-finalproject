import type { Moroso } from '../../../shared/types/finanzasAdmin'

/** Clave estable usuario + casa (agrupación del reporte morosos). */
export function morosoSelectionKey(m: Pick<Moroso, 'usuarioId' | 'casaId'>): string {
  return `${m.usuarioId}:${m.casaId ?? ''}`
}

export function morosoFromSelectionKey(key: string): { usuarioId: number; casaId?: number } {
  const sep = key.indexOf(':')
  const usuarioId = Number(key.slice(0, sep))
  const casaPart = key.slice(sep + 1)
  const casaId = casaPart === '' ? undefined : Number(casaPart)
  return { usuarioId, casaId: Number.isFinite(casaId) ? casaId : undefined }
}

export function morososFromKeys(keys: Iterable<string>): { usuarioId: number; casaId?: number }[] {
  return [...keys].map(morosoFromSelectionKey)
}
