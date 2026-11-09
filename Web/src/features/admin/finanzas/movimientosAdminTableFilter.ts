import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { MovimientoFnz } from '../../../shared/types/finanzasAdmin'

export const MOVIMIENTOS_ADMIN_COLUMNS: TableFilterColumn[] = [
  { key: 'fecha', header: 'Fecha', filterType: 'text' },
  { key: 'cuenta', header: 'Cuenta', filterType: 'text' },
  { key: 'tipo', header: 'Tipo', filterType: 'text' },
  { key: 'motivo', header: 'Motivo', filterType: 'text' },
  { key: 'cargo', header: 'Cargo', filterType: 'text' },
  { key: 'abono', header: 'Abono', filterType: 'text' },
]

function formatFechaMov(fecha: string) {
  return new Date(fecha).toLocaleString('es-MX')
}

function formatMonto(n: number | null | undefined) {
  if (n == null) return ''
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2 })
}

export const MOVIMIENTOS_ADMIN_ACCESSORS = {
  getRowSearchText: (m: MovimientoFnz) =>
    [
      formatFechaMov(m.fechaCreacion),
      m.cuentaNombre,
      m.tipoMovimiento,
      m.motivo,
      formatMonto(m.cargo),
      formatMonto(m.abono),
    ]
      .filter(Boolean)
      .join(' '),
  getColumnValue: (m: MovimientoFnz, columnKey: string) => {
    switch (columnKey) {
      case 'fecha':
        return formatFechaMov(m.fechaCreacion)
      case 'cuenta':
        return m.cuentaNombre
      case 'tipo':
        return m.tipoMovimiento
      case 'motivo':
        return m.motivo ?? ''
      case 'cargo':
        return formatMonto(m.cargo)
      case 'abono':
        return formatMonto(m.abono)
      default:
        return ''
    }
  },
}
