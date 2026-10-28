import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

interface QuickAccessCardProps {
  to: string
  icon: LucideIcon
  label: string
}

export function QuickAccessCard({ to, icon: Icon, label }: QuickAccessCardProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-surface-alt px-4 py-3 text-sm font-medium text-primary-dark shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98]"
    >
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
    </Link>
  )
}
