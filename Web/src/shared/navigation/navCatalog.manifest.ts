/**
 * Fuente canonica NAV-ROOT-001 (fase A).
 * APP_NAV / DB-008 deben derivar de aqui; paridad en navCatalogParity.test.ts (TC-NAV-01).
 */
export type NavCatalogNode = {
  clave: string
  path: string | null
  label: string
  icon: string
  groupKey: string
  profiles: Array<'Administrador' | 'Residente' | 'Guardia' | 'Trabajador'>
  order: number
  implemented: boolean
}

/** Claves sembradas por SQL/DB-008_sgr_menus_nav_root.sql (TC-NAV-02). */
export const DB_008_CLAVES: readonly string[] = [
  'inicio',
  'grp-mi-cuenta',
  'perfil',
  'finanzas-cuenta',
  'grp-comunidad-res',
  'anuncios',
  'encuestas',
  'juntas',
  'archivos',
  'areas-comunes',
  'visitas-pases',
  'notificaciones',
  'grp-registros-res',
  'tickets',
  'mis-vehiculos',
  'mis-mascotas',
  'grp-gestion',
  'admin-tickets',
  'admin-tickets-catalogos',
  'admin-usuarios',
  'admin-casas',
  'admin-finanzas',
  'admin-menus',
  'admin-perfiles',
  'grp-comunidad-adm',
  'admin-anuncios',
  'admin-encuestas',
  'admin-juntas',
  'admin-archivos',
  'admin-archivos-tipos',
  'grp-registro-adm',
  'admin-visitas',
  'admin-areas-reservas',
  'admin-vehiculos',
  'admin-mascotas',
  'admin-almacen',
  'guardia-validar-pase',
  'trabajador-tickets',
  'admin-reportes',
  'admin-bot',
  'admin-ntf-aviso',
]

export const NAV_CATALOG_NODES: NavCatalogNode[] = [
  { clave: 'inicio', path: '/', label: 'Inicio', icon: 'home', groupKey: 'principal', profiles: ['Administrador', 'Residente', 'Guardia', 'Trabajador'], order: 0, implemented: true },
  { clave: 'grp-mi-cuenta', path: null, label: 'Mi Cuenta', icon: 'folder', groupKey: 'mi-cuenta', profiles: ['Residente'], order: 9, implemented: true },
  { clave: 'perfil', path: '/perfil', label: 'Mi Perfil', icon: 'user', groupKey: 'mi-cuenta', profiles: ['Administrador', 'Residente', 'Guardia', 'Trabajador'], order: 10, implemented: true },
  { clave: 'finanzas-cuenta', path: '/finanzas/cuenta', label: 'Estado de cuenta', icon: 'wallet', groupKey: 'mi-cuenta', profiles: ['Residente'], order: 11, implemented: true },
  { clave: 'grp-comunidad-res', path: null, label: 'Mi Comunidad', icon: 'folder', groupKey: 'comunidad', profiles: ['Residente'], order: 19, implemented: true },
  { clave: 'anuncios', path: '/anuncios', label: 'Anuncios', icon: 'megaphone', groupKey: 'comunidad', profiles: ['Residente'], order: 20, implemented: true },
  { clave: 'encuestas', path: '/encuestas', label: 'Encuestas', icon: 'chart', groupKey: 'comunidad', profiles: ['Residente'], order: 21, implemented: true },
  { clave: 'juntas', path: '/juntas', label: 'Juntas', icon: 'calendar', groupKey: 'comunidad', profiles: ['Residente'], order: 22, implemented: true },
  { clave: 'archivos', path: '/archivos', label: 'Archivos', icon: 'folder', groupKey: 'comunidad', profiles: ['Residente'], order: 23, implemented: true },
  { clave: 'areas-comunes', path: '/areas-comunes', label: 'Áreas Comunes', icon: 'tree', groupKey: 'comunidad', profiles: ['Residente'], order: 24, implemented: true },
  { clave: 'visitas-pases', path: '/visitas/pases', label: 'Pases QR', icon: 'qr', groupKey: 'comunidad', profiles: ['Residente'], order: 25, implemented: true },
  { clave: 'notificaciones', path: '/notificaciones', label: 'Notificaciones', icon: 'bell', groupKey: 'mi-cuenta', profiles: ['Administrador', 'Residente', 'Guardia', 'Trabajador'], order: 12, implemented: true },
  { clave: 'grp-registros-res', path: null, label: 'Mis Registros', icon: 'folder', groupKey: 'registros', profiles: ['Residente'], order: 29, implemented: true },
  { clave: 'tickets', path: '/tickets', label: 'Mis Tickets', icon: 'ticket', groupKey: 'registros', profiles: ['Residente'], order: 30, implemented: true },
  { clave: 'mis-vehiculos', path: '/mis-vehiculos', label: 'Mis Vehículos', icon: 'car', groupKey: 'registros', profiles: ['Residente'], order: 31, implemented: true },
  { clave: 'mis-mascotas', path: '/mis-mascotas', label: 'Mis Mascotas', icon: 'paw', groupKey: 'registros', profiles: ['Residente'], order: 32, implemented: true },
  { clave: 'grp-gestion', path: null, label: 'Gestión', icon: 'folder', groupKey: 'gestion', profiles: ['Administrador'], order: 39, implemented: true },
  { clave: 'admin-tickets', path: '/admin/tickets', label: 'Tickets', icon: 'clipboard', groupKey: 'gestion', profiles: ['Administrador'], order: 40, implemented: true },
  { clave: 'admin-tickets-catalogos', path: '/admin/tickets/catalogos', label: 'Catálogos tickets', icon: 'clipboard', groupKey: 'gestion', profiles: ['Administrador'], order: 41, implemented: true },
  { clave: 'admin-usuarios', path: '/admin/usuarios', label: 'Residentes', icon: 'users', groupKey: 'gestion', profiles: ['Administrador'], order: 42, implemented: true },
  { clave: 'admin-casas', path: '/admin/casas', label: 'Casas', icon: 'building', groupKey: 'gestion', profiles: ['Administrador'], order: 43, implemented: true },
  { clave: 'admin-finanzas', path: '/admin/finanzas', label: 'Finanzas', icon: 'dollar', groupKey: 'gestion', profiles: ['Administrador'], order: 44, implemented: true },
  { clave: 'admin-menus', path: '/admin/menus', label: 'Menús', icon: 'grid', groupKey: 'gestion', profiles: ['Administrador'], order: 45, implemented: true },
  { clave: 'admin-perfiles', path: '/admin/perfiles', label: 'Perfiles', icon: 'shield', groupKey: 'gestion', profiles: ['Administrador'], order: 46, implemented: true },
  { clave: 'grp-comunidad-adm', path: null, label: 'Comunidad', icon: 'folder', groupKey: 'comunidad-admin', profiles: ['Administrador'], order: 49, implemented: true },
  { clave: 'admin-anuncios', path: '/admin/anuncios', label: 'Anuncios', icon: 'megaphone', groupKey: 'comunidad-admin', profiles: ['Administrador'], order: 50, implemented: true },
  { clave: 'admin-encuestas', path: '/admin/encuestas', label: 'Encuestas', icon: 'chart', groupKey: 'comunidad-admin', profiles: ['Administrador'], order: 51, implemented: true },
  { clave: 'admin-juntas', path: '/admin/juntas', label: 'Juntas', icon: 'calendar', groupKey: 'comunidad-admin', profiles: ['Administrador'], order: 52, implemented: true },
  { clave: 'admin-archivos', path: '/admin/archivos', label: 'Archivos', icon: 'folder', groupKey: 'comunidad-admin', profiles: ['Administrador'], order: 53, implemented: true },
  { clave: 'admin-archivos-tipos', path: '/admin/archivos/tipos', label: 'Tipos de documento', icon: 'folder', groupKey: 'comunidad-admin', profiles: ['Administrador'], order: 54, implemented: true },
  { clave: 'grp-registro-adm', path: null, label: 'Registro', icon: 'folder', groupKey: 'registro-admin', profiles: ['Administrador'], order: 59, implemented: true },
  { clave: 'admin-visitas', path: '/admin/visitas', label: 'Visitas', icon: 'eye', groupKey: 'registro-admin', profiles: ['Administrador'], order: 60, implemented: true },
  { clave: 'admin-areas-reservas', path: '/admin/areas-reservas', label: 'Áreas y reservas', icon: 'tree', groupKey: 'registro-admin', profiles: ['Administrador'], order: 61, implemented: true },
  { clave: 'admin-vehiculos', path: '/admin/vehiculos', label: 'Vehículos', icon: 'car', groupKey: 'registro-admin', profiles: ['Administrador'], order: 62, implemented: true },
  { clave: 'admin-mascotas', path: '/admin/mascotas', label: 'Mascotas', icon: 'paw', groupKey: 'registro-admin', profiles: ['Administrador'], order: 63, implemented: true },
  { clave: 'admin-almacen', path: '/admin/almacen', label: 'Almacén', icon: 'warehouse', groupKey: 'registro-admin', profiles: ['Administrador'], order: 64, implemented: true },
  { clave: 'guardia-validar-pase', path: '/guardia/validar-pase', label: 'Validar pase QR', icon: 'scan', groupKey: 'principal', profiles: ['Guardia', 'Administrador'], order: 5, implemented: true },
  { clave: 'trabajador-tickets', path: '/trabajador/tickets', label: 'Tickets asignados', icon: 'ticket', groupKey: 'principal', profiles: ['Trabajador'], order: 6, implemented: true },
  { clave: 'admin-reportes', path: '/admin/reportes', label: 'Reportes', icon: 'chart', groupKey: 'gestion', profiles: ['Administrador'], order: 47, implemented: true },
  { clave: 'admin-bot', path: '/admin/integraciones/bot', label: 'Integración BOT', icon: 'bot', groupKey: 'gestion', profiles: ['Administrador'], order: 48, implemented: false },
  { clave: 'admin-ntf-aviso', path: '/admin/notificaciones/aviso', label: 'Aviso general', icon: 'megaphone', groupKey: 'gestion', profiles: ['Administrador'], order: 49, implemented: true },
]

export function manifestClaveSet(): Set<string> {
  return new Set(NAV_CATALOG_NODES.map((n) => n.clave))
}
