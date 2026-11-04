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
    <Link to={to} className="cq-portal-quick-link">
      <span className="cq-portal-quick-link__icon" aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <span>{label}</span>
      <ChevronRight className="cq-portal-quick-link__chevron h-4 w-4" aria-hidden />
    </Link>
  )
}
