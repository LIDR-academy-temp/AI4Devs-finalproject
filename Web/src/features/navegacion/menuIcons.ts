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
}

export function iconFromMenuKey(icono: string | null | undefined): LucideIcon {
  if (!icono) return Circle
  const key = icono.trim().toLowerCase().replace(/\s+/g, '')
  return ICON_MAP[key] ?? Circle
}
