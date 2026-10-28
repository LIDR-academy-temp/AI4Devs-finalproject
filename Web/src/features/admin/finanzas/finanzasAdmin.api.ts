import { apiGet, apiPatch, apiPost } from '../../../shared/lib/apiClient'
import type { EstadoCuenta } from '../../../shared/types/finanzas'
import type { GenerarCuotasResult, Moroso, RegistrarPagoInput } from '../../../shared/types/finanzasAdmin'

export async function getCuotasUsuario(token: string, usuarioId: number) {
  return apiGet<EstadoCuenta>(`/FNZ/Cuotas?usuarioId=${usuarioId}`, token)
}

export async function getMorosos(token: string, mes?: number, anio?: number) {
  const params = new URLSearchParams()
  if (mes !== undefined && anio !== undefined) {
    params.set('mes', String(mes))
    params.set('anio', String(anio))
  }
  const q = params.toString()
  return apiGet<Moroso[]>(`/Reports/Reportes/Morosos${q ? `?${q}` : ''}`, token)
}

export async function registrarPago(token: string, cuotaId: number, body: RegistrarPagoInput) {
  return apiPatch<void>(`/FNZ/Cuotas/${cuotaId}/pago`, body, token)
}

export async function generarCuotas(token: string, body: {
  mes: number
  anio: number
  monto: number
  fechaVencimiento: string
  cuentaId?: number
}) {
  return apiPost<GenerarCuotasResult>('/FNZ/Cuotas/generar', body, token)
}
