import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { AutomovilListItem } from '../../../shared/types/vehiculos'

export const VEHICULOS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'placas', header: 'Placas', filterType: 'text' },
  { key: 'residente', header: 'Residente', filterType: 'text' },
  { key: 'casa', header: 'Casa', filterType: 'text' },
  { key: 'vehiculo', header: 'Marca / modelo', filterType: 'text' },
  { key: 'color', header: 'Color', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const VEHICULOS_TABLE_ACCESSORS = {
  getRowSearchText: (v: AutomovilListItem) =>
    [
      v.placas,
      v.nombreUsuario,
      v.correoUsuario,
      v.numeroCasa,
      v.marca,
      v.modelo,
      v.modeloLibre,
      v.color,
    ]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (v: AutomovilListItem, columnKey: string) => {
    switch (columnKey) {
      case 'placas':
        return v.placas ?? ''
      case 'residente':
        return [v.nombreUsuario, v.correoUsuario].filter(Boolean).join(' ')
      case 'casa':
        return v.numeroCasa ?? '—'
      case 'vehiculo':
        return [v.marca, v.modelo ?? v.modeloLibre].filter(Boolean).join(' ') || '—'
      case 'color':
        return v.color ?? '—'
      default:
        return ''
    }
  },
}
