import { apiDelete, apiGet, apiPost, apiPut } from '../../shared/lib/apiClient'
import type { MenuAdminItem, MenuNodoDto, PerfilListItem, MenuPerfilPermiso, PerfilMenuPermiso } from './types'

export async function fetchMenusNavegacion() {
  return apiGet<MenuNodoDto[]>('/SGR/Navegacion/menus')
}

export async function fetchMenusAdmin(incluirEliminados = false) {
  const qs = incluirEliminados ? '?incluirEliminados=true' : ''
  return apiGet<MenuAdminItem[]>(`/SGR/Menus/admin${qs}`)
}

export async function createMenuAdmin(body: {
  titulo: string
  ruta?: string | null
  icono?: string | null
  orden: number
  padreMenuId?: number | null
}) {
  return apiPost<MenuAdminItem>('/SGR/Menus/admin', body)
}

export async function updateMenuAdmin(
  id: number,
  body: {
    titulo?: string
    ruta?: string | null
    icono?: string | null
    orden?: number
    padreMenuId?: number | null
  },
) {
  return apiPut<MenuAdminItem>(`/SGR/Menus/admin/${id}`, body)
}

export async function deleteMenuAdmin(id: number) {
  return apiDelete(`/SGR/Menus/admin/${id}`)
}

export async function fetchPermisosMenus(perfilId: number) {
  return apiGet<PerfilMenuPermiso[]>(`/SGR/Perfiles/${perfilId}/permisos-menus`)
}

export async function savePermisosMenus(
  perfilId: number,
  menus: { menuId: number; visible: boolean }[],
) {
  return apiPut<PerfilMenuPermiso[]>(`/SGR/Perfiles/${perfilId}/permisos-menus`, { menus })
}

export async function fetchPermisosPerfilesMenu(menuId: number) {
  return apiGet<MenuPerfilPermiso[]>(`/SGR/Menus/admin/${menuId}/permisos-perfiles`)
}

export async function savePermisosPerfilesMenu(
  menuId: number,
  perfiles: { perfilId: number; visible: boolean }[],
) {
  return apiPut<MenuPerfilPermiso[]>(`/SGR/Menus/admin/${menuId}/permisos-perfiles`, { perfiles })
}

/** Listado JWT admin (evita legacy vsPerfiles / columna Perfil). */
export async function fetchPerfilesAdmin() {
  return apiGet<PerfilListItem[]>('/SGR/Perfiles/admin')
}
