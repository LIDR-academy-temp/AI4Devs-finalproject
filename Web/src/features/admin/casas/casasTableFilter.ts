import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { CasaAdminItem } from '../../../shared/types/casasAdmin'

export const CASAS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'condominio', header: 'Condominio', filterType: 'text' },
  { key: 'direccion', header: 'Dirección', filterType: 'text' },
  { key: 'numero', header: 'Núm. ext.', filterType: 'text' },
  { key: 'propietario', header: 'Propietario', filterType: 'text' },
  {
    key: 'estado',
    header: 'Estado',
    filterType: 'select',
    selectOptions: [{ value: 'activa', label: 'Activa' }],
  },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export function createCasasTableAccessors(correoByUsuarioId: Map<number, string>) {
  return {
    getRowSearchText: (c: CasaAdminItem) => {
      const correo =
        c.propietarioUsuarioId != null ? correoByUsuarioId.get(c.propietarioUsuarioId) : undefined
      return [
        c.condominioNombre,
        String(c.condominioId),
        c.direccion,
        c.numero,
        c.propietarioNombre,
        correo,
        'Activa',
      ]
        .filter(Boolean)
        .join(' ')
    },
    getColumnValue: (c: CasaAdminItem, columnKey: string) => {
      const correo =
        c.propietarioUsuarioId != null ? correoByUsuarioId.get(c.propietarioUsuarioId) : undefined
      switch (columnKey) {
        case 'condominio':
          return c.condominioNombre ?? String(c.condominioId)
        case 'direccion':
          return c.direccion ?? ''
        case 'numero':
          return c.numero ?? ''
        case 'propietario':
          if (!c.propietarioNombre) return 'sin propietario'
          return [c.propietarioNombre, correo].filter(Boolean).join(' ')
        case 'estado':
          return 'activa'
        default:
          return ''
      }
    },
  }
}
