export type MenuNodoDto = {
  menuId: number
  titulo: string
  ruta: string | null
  icono: string | null
  orden: number
  hijos: MenuNodoDto[]
}

export type MenuAdminItem = {
  menuId: number
  titulo: string
  ruta: string | null
  icono: string | null
  orden: number
  padreMenuId: number | null
  eliminado: boolean
}

export type PerfilMenuPermiso = {
  menuId: number
  titulo: string
  visible: boolean
  asignado: boolean
}

export type PerfilListItem = {
  perfilId: number
  nombre: string
  descripcion: string | null
  bAdministrador: boolean
}
