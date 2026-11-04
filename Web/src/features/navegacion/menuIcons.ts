import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Building2,
  CalendarDays,
  Car,
  Circle,
  ClipboardList,
  DollarSign,
  Eye,
  FolderOpen,
  Home,
  LayoutGrid,
  Megaphone,
  PawPrint,
  Settings,
  Shield,
  TicketCheck,
  TreePine,
  User,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  ticket: TicketCheck,
  tickets: ClipboardList,
  wallet: Wallet,
  user: User,
  users: Users,
  megaphone: Megaphone,
  chart: BarChart3,
  barchart: BarChart3,
  calendar: CalendarDays,
  folder: FolderOpen,
  tree: TreePine,
  car: Car,
  paw: PawPrint,
  building: Building2,
  dollar: DollarSign,
  finanzas: DollarSign,
  eye: Eye,
  warehouse: Warehouse,
  shield: Shield,
  settings: Settings,
  layout: LayoutGrid,
  grid: LayoutGrid,
}

/** Claves válidas para icono de menú (select admin). */
export const MENU_ICON_OPTIONS = Object.keys(ICON_MAP).sort()

export function iconFromMenuKey(icono: string | null | undefined): LucideIcon {
  if (!icono) return Circle
  const key = icono.trim().toLowerCase().replace(/\s+/g, '')
  return ICON_MAP[key] ?? Circle
}
