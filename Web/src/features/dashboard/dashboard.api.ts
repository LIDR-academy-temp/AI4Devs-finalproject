import { apiGet } from '../../shared/lib/apiClient'
import type { DashboardResumen } from '../../shared/types/dashboard'

export async function getDashboardResumen(token: string, mes?: number, anio?: number) {
  const params = new URLSearchParams()
  if (mes != null && anio != null) {
    params.set('mes', String(mes))
    params.set('anio', String(anio))
  }
  const qs = params.toString()
  const path = qs ? `/Dashboard/Resumen?${qs}` : '/Dashboard/Resumen'
  return apiGet<DashboardResumen>(path, token)
}
