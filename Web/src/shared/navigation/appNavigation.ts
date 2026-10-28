import type { LucideIcon } from 'lucide-react'
import {
  Home,
  TicketCheck,
  Wallet,
  User,
  Megaphone,
  BarChart3,
  FolderOpen,
  CalendarDays,
  TreePine,
  Car,
  PawPrint,
  Users,
  Building2,
  DollarSign,
  Eye,
  Warehouse,
  ClipboardList,
  LayoutGrid,
  Shield,
} from 'lucide-react'

export type NavGroup = {
  key: string
  label: string
  perfil?: 'Administrador' | 'Residente'
}

export type NavItem = {
  path: string
  label: string
  icon: LucideIcon
  group: string
  adminOnly?: boolean
  residentOnly?: boolean
  implemented: boolean
  order: number
}

export const NAV_GROUPS: NavGroup[] = [
  { key: 'principal', label: '' },
  { key: 'mi-cuenta', label: 'Mi Cuenta', perfil: 'Residente' },
  { key: 'comunidad', label: 'Mi Comunidad', perfil: 'Residente' },
  { key: 'registros', label: 'Mis Registros', perfil: 'Residente' },
  { key: 'gestion', label: 'Gestión', perfil: 'Administrador' },
  { key: 'comunidad-admin', label: 'Comunidad', perfil: 'Administrador' },
  { key: 'registro-admin', label: 'Registro', perfil: 'Administrador' },
]

export const APP_NAV: NavItem[] = [
  // ── Principal ──
  { path: '/', label: 'Inicio', icon: Home, group: 'principal', order: 0, implemented: true },

  // ── Residente: Mi Cuenta ──
  { path: '/perfil', label: 'Mi Perfil', icon: User, group: 'mi-cuenta', residentOnly: true, order: 10, implemented: true },
  { path: '/finanzas/cuenta', label: 'Estado de cuenta', icon: Wallet, group: 'mi-cuenta', residentOnly: true, order: 11, implemented: true },

  // ── Residente: Mi Comunidad ──
  { path: '/anuncios', label: 'Anuncios', icon: Megaphone, group: 'comunidad', residentOnly: true, order: 20, implemented: true },
  { path: '/encuestas', label: 'Encuestas', icon: BarChart3, group: 'comunidad', residentOnly: true, order: 21, implemented: true },
  { path: '/juntas', label: 'Juntas', icon: CalendarDays, group: 'comunidad', residentOnly: true, order: 22, implemented: true },
  { path: '/archivos', label: 'Archivos', icon: FolderOpen, group: 'comunidad', residentOnly: true, order: 23, implemented: true },
  { path: '/areas-comunes', label: 'Áreas Comunes', icon: TreePine, group: 'comunidad', residentOnly: true, order: 24, implemented: true },

  // ── Residente: Mis Registros ──
  { path: '/tickets', label: 'Mis Tickets', icon: TicketCheck, group: 'registros', residentOnly: true, order: 30, implemented: true },
  { path: '/mis-vehiculos', label: 'Mis Vehículos', icon: Car, group: 'registros', residentOnly: true, order: 31, implemented: true },
  { path: '/mis-mascotas', label: 'Mis Mascotas', icon: PawPrint, group: 'registros', residentOnly: true, order: 32, implemented: true },

  // ── Admin: Gestión ──
  { path: '/admin/tickets', label: 'Tickets', icon: ClipboardList, group: 'gestion', adminOnly: true, order: 40, implemented: true },
  { path: '/admin/usuarios', label: 'Residentes', icon: Users, group: 'gestion', adminOnly: true, order: 41, implemented: true },
  { path: '/admin/casas', label: 'Casas', icon: Building2, group: 'gestion', adminOnly: true, order: 42, implemented: true },
  { path: '/admin/finanzas', label: 'Finanzas', icon: DollarSign, group: 'gestion', adminOnly: true, order: 43, implemented: true },

  // ── Admin: Comunidad ──
  { path: '/admin/anuncios', label: 'Anuncios', icon: Megaphone, group: 'comunidad-admin', adminOnly: true, order: 50, implemented: true },
  { path: '/admin/encuestas', label: 'Encuestas', icon: BarChart3, group: 'comunidad-admin', adminOnly: true, order: 51, implemented: true },
  { path: '/admin/juntas', label: 'Juntas', icon: CalendarDays, group: 'comunidad-admin', adminOnly: true, order: 52, implemented: true },
  { path: '/admin/archivos', label: 'Archivos', icon: FolderOpen, group: 'comunidad-admin', adminOnly: true, order: 53, implemented: true },
  { path: '/admin/archivos/tipos', label: 'Tipos de documento', icon: FolderOpen, group: 'comunidad-admin', adminOnly: true, order: 54, implemented: true },

  // ── Admin: Registro ──
  { path: '/admin/visitas', label: 'Visitas', icon: Eye, group: 'registro-admin', adminOnly: true, order: 60, implemented: true },
  { path: '/admin/vehiculos', label: 'Vehículos', icon: Car, group: 'registro-admin', adminOnly: true, order: 61, implemented: true },
  { path: '/admin/mascotas', label: 'Mascotas', icon: PawPrint, group: 'registro-admin', adminOnly: true, order: 62, implemented: true },
  { path: '/admin/almacen', label: 'Almacén', icon: Warehouse, group: 'registro-admin', adminOnly: true, order: 63, implemented: true },
  { path: '/admin/menus', label: 'Menús', icon: LayoutGrid, group: 'gestion', adminOnly: true, order: 44, implemented: true },
  { path: '/admin/perfiles', label: 'Perfiles', icon: Shield, group: 'gestion', adminOnly: true, order: 45, implemented: true },
]

export function navItemsForPerfil(perfil: string): NavItem[] {
  const isAdmin = perfil === 'Administrador'
  return APP_NAV
    .filter((item) => {
      if (item.adminOnly && !isAdmin) return false
      if (item.residentOnly && isAdmin) return false
      return true
    })
    .sort((a, b) => a.order - b.order)
}

export function navGroupsForPerfil(perfil: string): NavGroup[] {
  const isAdmin = perfil === 'Administrador'
  const items = navItemsForPerfil(perfil)
  const usedGroups = new Set(items.map((i) => i.group))
  return NAV_GROUPS.filter((g) => {
    if (!usedGroups.has(g.key)) return false
    if (g.perfil === 'Residente' && isAdmin) return false
    if (g.perfil === 'Administrador' && !isAdmin) return false
    return true
  })
}
