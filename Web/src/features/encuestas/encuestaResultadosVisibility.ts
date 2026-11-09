import type { EncuestaListItem } from '../../shared/types/encuestas'

/** Regla M-2: puede ver agregados si ya participó o la encuesta ya cerró por fecha fin. */
export function puedeVerResultadosEncuesta(
  encuesta: Pick<EncuestaListItem, 'yaParticipo' | 'fechaFin'>,
): boolean {
  if (encuesta.yaParticipo) {
    return true
  }
  if (encuesta.fechaFin) {
    return new Date(encuesta.fechaFin).getTime() < Date.now()
  }
  return false
}
