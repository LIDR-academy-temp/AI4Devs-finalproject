import { apiGet, apiPatch, apiPost } from '../../../shared/lib/apiClient'
import type { EstadoCuenta } from '../../../shared/types/finanzas'
import type {
  GenerarCuotasResult,
  MorasBatchResult,
  Moroso,
  RegistrarPagoInput,
  CuentaFnzCatalogo,
  CuentaFnzAdmin,
  TipoCuentaFnz,
  TipoMovimientoFnz,
  PeriodoCuotasGenerado,
  MovimientoFnz,
} from '../../../shared/types/finanzasAdmin'

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

export async function aplicarMorasMorosos(
  token: string,
  body: {
    montoMora: number
    mes?: number
    anio?: number
    residentes: { usuarioId: number; casaId?: number | null }[]
  },
) {
  return apiPost<MorasBatchResult>('/Reports/Reportes/Morosos/moras/aplicar', body, token)
}

export async function condonarMorasMorosos(
  token: string,
  body: { mes?: number; anio?: number; residentes: { usuarioId: number; casaId?: number | null }[] },
) {
  return apiPost<MorasBatchResult>('/Reports/Reportes/Morosos/moras/condonar', body, token)
}

export async function registrarPago(token: string, cuotaId: number, body: RegistrarPagoInput) {
  return apiPatch<void>(`/FNZ/Cuotas/${cuotaId}/pago`, body, token)
}

export async function listCuentasAdmin(token: string) {
  return apiGet<CuentaFnzAdmin[]>('/FNZ/Cuentas/admin', token)
}

export async function listTiposCuentaAdmin(token: string) {
  return apiGet<TipoCuentaFnz[]>('/FNZ/TiposCuenta/admin', token)
}

export async function listTiposMovimientoAdmin(token: string) {
  return apiGet<TipoMovimientoFnz[]>('/FNZ/TiposMovimiento/admin', token)
}

export async function listPeriodosGeneradosAdmin(token: string) {
  return apiGet<PeriodoCuotasGenerado[]>('/FNZ/Cuotas/generaciones/admin', token)
}

export async function listMovimientosAdmin(token: string) {
  return apiGet<MovimientoFnz[]>('/FNZ/Transacciones/admin', token)
}

export async function registrarMovimientoAdmin(
  token: string,
  body: { cuentaId: number; tipoMovimiento: string; monto: number; motivo: string },
) {
  return apiPost<MovimientoFnz>('/FNZ/Transacciones/admin', body, token)
}

/** Catálogo reducido para combo de generar cuotas */
export async function getCuentasFnz(token: string) {
  const res = await listCuentasAdmin(token)
  if (res.status !== 200 || !res.data) {
    return { status: res.status, problem: res.problem, data: undefined as CuentaFnzCatalogo[] | undefined }
  }
  return {
    status: 200 as const,
    data: res.data.map((c) => ({ cuentaId: c.cuentaId, nombre: c.nombre })),
  }
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
