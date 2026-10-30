import type { CuotaEstado } from '../../../shared/types/finanzas'

export function cuotaMontoTotal(cuota: Pick<CuotaEstado, 'monto' | 'montoMora'>): number {
  return cuota.monto + (cuota.montoMora ?? 0)
}
