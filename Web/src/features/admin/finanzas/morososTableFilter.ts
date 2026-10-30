import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { Moroso } from '../../../shared/types/finanzasAdmin'

export const MOROSOS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Residente', filterType: 'text' },
  { key: 'casa', header: 'Casa', filterType: 'text' },
  { key: 'cuotas', header: 'Cuotas vencidas', filterType: 'text' },
  { key: 'moras', header: 'Moras aplicadas', filterType: 'text' },
  { key: 'total', header: 'Total adeudado', filterType: 'text' },
]

export const MOROSOS_TABLE_ACCESSORS = {
  getRowSearchText: (m: Moroso) =>
    [m.nombre, m.casa, String(m.cuotasVencidas), String(m.morasAplicadas), String(m.totalAdeudado)]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (m: Moroso, columnKey: string) => {
    switch (columnKey) {
      case 'nombre':
        return m.nombre
      case 'casa':
        return m.casa ?? ''
      case 'cuotas':
        return String(m.cuotasVencidas)
      case 'moras':
        return String(m.morasAplicadas)
      case 'total':
        return String(m.totalAdeudado)
      default:
        return ''
    }
  },
}
