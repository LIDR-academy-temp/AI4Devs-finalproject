import type { TableFilterColumn } from '../../../shared/types/tableFilter'
import type { UsuarioPadronItem } from '../../../shared/types/usuariosAdmin'

export const USUARIOS_TABLE_COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Nombre', filterType: 'text' },
  { key: 'correo', header: 'Correo', filterType: 'text' },
  { key: 'perfil', header: 'Perfil', filterType: 'text' },
  {
    key: 'activo',
    header: 'Activo',
    filterType: 'select',
    selectOptions: [
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
    ],
  },
  { key: 'acciones', header: 'Acciones', filterType: 'none' },
]

export const USUARIOS_TABLE_ACCESSORS = {
  getRowSearchText: (u: UsuarioPadronItem) =>
    [u.nombre, u.correo, u.perfil, u.telefono, u.bActivo ? 'activo' : 'inactivo'].filter(Boolean).join(' '),
  getColumnValue: (u: UsuarioPadronItem, columnKey: string) => {
    switch (columnKey) {
      case 'nombre':
        return u.nombre
      case 'correo':
        return u.correo
      case 'perfil':
        return u.perfil
      case 'activo':
        return u.bActivo ? 'si' : 'no'
      default:
        return ''
    }
  },
}
