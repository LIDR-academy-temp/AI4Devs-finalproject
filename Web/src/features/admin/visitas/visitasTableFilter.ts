import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { VisitaListItem } from '../../../shared/types/visitas'

export const VISITAS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'visitante', header: 'Visitante', filterType: 'text' },
  { key: 'identificacion', header: 'Identificación', filterType: 'text' },
  { key: 'casa', header: 'Casa', filterType: 'text' },
  { key: 'entrada', header: 'Entrada', filterType: 'text' },
  { key: 'salida', header: 'Salida', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const VISITAS_TABLE_ACCESSORS = {
  getRowSearchText: (v: VisitaListItem) =>
    [
      v.visitanteNombre,
      v.tipoIdentificacion,
      v.numeroIdentificacion,
      v.numeroCasa,
    ]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (v: VisitaListItem, columnKey: string) => {
    switch (columnKey) {
      case 'visitante':
        return v.visitanteNombre
      case 'identificacion':
        return `${v.tipoIdentificacion}: ${v.numeroIdentificacion}`
      case 'casa':
        return v.numeroCasa ?? '—'
      case 'entrada':
        return new Date(v.fechaEntrada).toLocaleString('es-MX')
      case 'salida':
        return v.fechaSalida
          ? new Date(v.fechaSalida).toLocaleString('es-MX')
          : 'en visita'
      default:
        return ''
    }
  },
}
