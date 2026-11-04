import { apiGet } from '../../shared/lib/apiClient'
import { getMorosos } from '../admin/finanzas/finanzasAdmin.api'
import type { Moroso } from '../../shared/types/finanzasAdmin'

export type BiKpiSnapshot = {
  fecha: string
  ticketsAbiertos: number
  ticketsCerrados: number
  tiempoMedioResolucionHoras: number
  ingresosMXN: number
  egresosMXN: number
  residentesMorosos: number
  casasTotales: number
  casasOcupadas: number
}

export async function getBiTendencias(token: string, meses = 6) {
  return apiGet<BiKpiSnapshot[]>(`/Reports/Bi/tendencias?meses=${meses}`, token)
}

export async function getMorososReporte(
  token: string,
  mes?: number,
  anio?: number,
): Promise<{ data?: Moroso[]; problem?: unknown; status: number }> {
  return getMorosos(token, mes, anio)
}

export function biExportUrl(meses: number, formato: 'pdf' | 'xlsx') {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
  return `${base}/Reports/Bi/export?meses=${meses}&formato=${formato}`
}

export function reporteFinanzasExportUrl(mes: number, anio: number, formato: 'pdf' | 'xlsx') {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
  return `${base}/Reports/Reportes/FinanzasMes/export?mes=${mes}&anio=${anio}&formato=${formato}`
}

export function reporteTicketsExportUrl(mes: number, anio: number, formato: 'pdf' | 'xlsx') {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
  return `${base}/Reports/Reportes/TicketsPeriodo/export?mes=${mes}&anio=${anio}&formato=${formato}`
}
