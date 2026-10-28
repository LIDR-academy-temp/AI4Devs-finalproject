import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  Car,
  ClipboardList,
  DollarSign,
  Eye,
  FolderOpen,
  Home,
  LayoutGrid,
  Megaphone,
  PawPrint,
  QrCode,
  ScanLine,
  Shield,
  TicketCheck,
  TreePine,
  User,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'
import { NAV_CATALOG_NODES, type NavCatalogNode } from './navCatalog.manifest'

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
  guardiaOnly?: boolean
  implemented: boolean
  order: number
}

type NavProfile = NavCatalogNode['profiles'][number]

const ICON_BY_KEY: Record<string, LucideIcon> = {
  home: Home,
  folder: FolderOpen,
  user: User,
  wallet: Wallet,
  megaphone: Megaphone,
  chart: BarChart3,
  calendar: CalendarDays,
  tree: TreePine,
  qr: QrCode,
  bell: Bell,
  ticket: TicketCheck,
  car: Car,
  paw: PawPrint,
  clipboard: ClipboardList,
  users: Users,
  building: Building2,
  dollar: DollarSign,
  grid: LayoutGrid,
  shield: Shield,
  eye: Eye,
  warehouse: Warehouse,
  scan: ScanLine,
  bot: Bot,
}

function groupPerfil(node: NavCatalogNode): NavGroup['perfil'] | undefined {
  if (node.profiles.length === 1 && node.profiles[0] === 'Administrador') {
    return 'Administrador'
  }
  if (node.profiles.includes('Residente') && !node.profiles.includes('Administrador')) {
    return 'Residente'
  }
  return undefined
}

const groupHeaderNodes = NAV_CATALOG_NODES.filter(
  (n) => n.path === null && n.clave.startsWith('grp-'),
)

export const NAV_GROUPS: NavGroup[] = [
  { key: 'principal', label: '' },
  ...groupHeaderNodes.map((n) => ({
    key: n.groupKey,
    label: n.label,
    perfil: groupPerfil(n),
  })),
]

export const APP_NAV: NavItem[] = NAV_CATALOG_NODES.filter(
  (n) => n.implemented && n.path,
).map((n) => ({
  path: n.path as string,
  label: n.label,
  icon: ICON_BY_KEY[n.icon] ?? FolderOpen,
  group: n.groupKey,
  order: n.order,
  implemented: n.implemented,
}))

function pathsForPerfil(perfil: NavProfile): Set<string> {
  return new Set(
    NAV_CATALOG_NODES.filter(
      (n) => n.implemented && n.path && n.profiles.includes(perfil),
    ).map((n) => n.path as string),
  )
}

export function navItemsForPerfil(perfil: string): NavItem[] {
  const allowed = pathsForPerfil(perfil as NavProfile)
  return APP_NAV.filter((item) => allowed.has(item.path)).sort(
    (a, b) => a.order - b.order,
  )
}

export function navGroupsForPerfil(perfil: string): NavGroup[] {
  const items = navItemsForPerfil(perfil)
  const usedGroups = new Set(items.map((i) => i.group))
  return NAV_GROUPS.filter((g) => usedGroups.has(g.key))
}
