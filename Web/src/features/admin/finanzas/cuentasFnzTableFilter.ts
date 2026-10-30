import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { CuentaFnzAdmin } from '../../../shared/types/finanzasAdmin'

export const CUENTAS_FNZ_COLUMNS: TableFilterColumn[] = [
  { key: 'id', header: 'ID', filterType: 'text' },
  { key: 'nombre', header: 'Nombre', filterType: 'text' },
  { key: 'tipo', header: 'Tipo', filterType: 'text' },
  { key: 'saldo', header: 'Saldo', filterType: 'text' },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const CUENTAS_FNZ_ACCESSORS = {
  getRowSearchText: (c: CuentaFnzAdmin) => [c.cuentaId, c.nombre, c.tipo, c.saldo].join(' '),
  getColumnValue: (c: CuentaFnzAdmin, key: string) => {
    switch (key) {
      case 'id':
        return String(c.cuentaId)
      case 'nombre':
        return c.nombre
      case 'tipo':
        return c.tipo
      case 'saldo':
        return c.saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })
      default:
        return ''
    }
  },
}
