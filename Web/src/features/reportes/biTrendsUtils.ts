import type { BiKpiSnapshot } from './reportesAdmin.api'

/** API puede devolver camelCase (JsonPropertyName) o PascalCase según serializador. */
export function normalizeBiSnapshot(raw: Record<string, unknown>): BiKpiSnapshot {
  const num = (camel: string, pascal: string) =>
    Number(raw[camel] ?? raw[pascal] ?? 0)
  const str = (camel: string, pascal: string) =>
    String(raw[camel] ?? raw[pascal] ?? '')

  return {
    fecha: str('fecha', 'Fecha'),
    ticketsAbiertos: num('ticketsAbiertos', 'TicketsAbiertos'),
    ticketsCerrados: num('ticketsCerrados', 'TicketsCerrados'),
    tiempoMedioResolucionHoras: num('tiempoMedioResolucionHoras', 'TiempoMedioResolucionHoras'),
    ingresosMXN: num('ingresosMXN', 'IngresosMXN'),
    egresosMXN: num('egresosMXN', 'EgresosMXN'),
    residentesMorosos: num('residentesMorosos', 'ResidentesMorosos'),
    casasTotales: num('casasTotales', 'CasasTotales'),
    casasOcupadas: num('casasOcupadas', 'CasasOcupadas'),
  }
}

export function normalizeBiSnapshots(data: unknown): BiKpiSnapshot[] {
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeBiSnapshot(row as Record<string, unknown>))
}

export function formatBiPeriodLabel(isoDate: string): string {
  if (!isoDate) return '—'
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
}

export function morosidadPct(s: BiKpiSnapshot): number {
  if (s.casasOcupadas <= 0) return 0
  return Math.round((s.residentesMorosos / s.casasOcupadas) * 100)
}

export function latestSnapshot(snapshots: BiKpiSnapshot[]): BiKpiSnapshot | null {
  if (snapshots.length === 0) return null
  return [...snapshots].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1) ?? null
}

export function biHasVisibleTrend(snapshots: BiKpiSnapshot[]): boolean {
  return snapshots.some(
    (s) =>
      s.ticketsAbiertos > 0 ||
      s.ticketsCerrados > 0 ||
      s.ingresosMXN > 0 ||
      s.egresosMXN > 0 ||
      s.residentesMorosos > 0 ||
      s.tiempoMedioResolucionHoras > 0,
  )
}
