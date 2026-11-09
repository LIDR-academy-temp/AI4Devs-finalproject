import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { PaseVisita, PaseVisitaEstadoLista } from '../../../shared/types/visitasPase'

export const PASES_QR_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'visitante', header: 'Visitante', filterType: 'text' },
  { key: 'residente', header: 'Residente', filterType: 'text' },
  { key: 'casa', header: 'Casa', filterType: 'text' },
  { key: 'tipo', header: 'Tipo', filterType: 'text' },
  { key: 'vigencia', header: 'Vigencia', filterType: 'text' },
  { key: 'estado', header: 'Estado', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

function tipoPaseLabel(p: PaseVisita) {
  return p.unaOcasion === false ? 'Rango de días' : 'Una ocasión'
}

function vigenciaResumen(p: PaseVisita) {
  if (p.unaOcasion === false) {
    const d = new Date(p.fechaEmision).toLocaleDateString('es-MX')
    const h = p.fechaExpira ? new Date(p.fechaExpira).toLocaleDateString('es-MX') : '—'
    return `${d} – ${h}`
  }
  return p.fechaExpira ? new Date(p.fechaExpira).toLocaleString('es-MX') : '—'
}

/** Misma lógica que `EnriquecerEstadoLista` en API (fallback si falta en JSON). */
export function resolveEstadoLista(p: PaseVisita): PaseVisitaEstadoLista {
  if (p.estadoLista) return p.estadoLista
  const now = Date.now()
  const emision = new Date(p.fechaEmision).getTime()
  const expira = p.fechaExpira ? new Date(p.fechaExpira).getTime() : null
  const unaOcasion = p.unaOcasion !== false
  if (unaOcasion && p.bUsado) return 'usado'
  if (expira !== null && expira < now) return 'expirado'
  if (emision > now) return 'pendiente'
  return 'vigente'
}

const ESTADO_LABELS: Record<PaseVisitaEstadoLista, string> = {
  vigente: 'Vigente',
  expirado: 'Expirado',
  usado: 'Usado',
  pendiente: 'Programado',
}

export function paseEstadoBadgeClass(estado: PaseVisitaEstadoLista): string {
  switch (estado) {
    case 'vigente':
      return 'badge bg-success'
    case 'pendiente':
      return 'badge bg-info text-dark'
    case 'expirado':
      return 'badge bg-warning text-dark'
    case 'usado':
      return 'badge bg-secondary'
    default:
      return 'badge bg-light text-dark'
  }
}

function estadoLabel(p: PaseVisita) {
  const estado = resolveEstadoLista(p)
  return ESTADO_LABELS[estado] ?? estado
}

export const PASES_QR_TABLE_ACCESSORS = {
  getRowSearchText: (p: PaseVisita) =>
    [
      p.nombreVisitante,
      p.nombreVisitado,
      p.direccionCasa,
      p.codigoQr,
      tipoPaseLabel(p),
      estadoLabel(p),
    ]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (p: PaseVisita, columnKey: string) => {
    switch (columnKey) {
      case 'visitante':
        return p.nombreVisitante
      case 'residente':
        return p.nombreVisitado ?? '—'
      case 'casa':
        return p.direccionCasa ?? '—'
      case 'tipo':
        return tipoPaseLabel(p)
      case 'vigencia':
        return vigenciaResumen(p)
      case 'estado':
        return estadoLabel(p)
      default:
        return ''
    }
  },
}

export { estadoLabel, tipoPaseLabel, vigenciaResumen }
