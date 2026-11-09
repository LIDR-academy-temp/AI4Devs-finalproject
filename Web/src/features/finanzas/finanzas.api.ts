import { apiGet } from '../../shared/lib/apiClient'
import type { EstadoCuenta } from '../../shared/types/finanzas'

export async function getEstadoCuenta(token: string) {
  return apiGet<EstadoCuenta>('/FNZ/Cuotas/mis', token)
}
