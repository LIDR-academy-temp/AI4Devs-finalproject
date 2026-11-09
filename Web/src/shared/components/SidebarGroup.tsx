import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { NavGroup, NavItem } from '../navigation/appNavigation'
import { SidebarItem } from './SidebarItem'

interface SidebarGroupProps {
  group: NavGroup
  items: NavItem[]
  collapsed: boolean
}

function isItemActive(pathname: string, item: NavItem): boolean {
  return (
    pathname === item.path ||
    (item.path !== '/' && pathname.startsWith(`${item.path}/`))
  )
}

export function SidebarGroup({ group, items, collapsed }: SidebarGroupProps) {
  const location = useLocation()
  const activeInGroup = items.some((item) => isItemActive(location.pathname, item))
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (activeInGroup) setOpen(true)
  }, [location.pathname, activeInGroup])

  if (items.length === 0) return null

  const collapsible = Boolean(group.label) && !collapsed

  return (
    <div
      className={`cq-nav-group flex flex-col ${activeInGroup ? 'cq-nav-group--active' : ''}`}
    >
      {group.label && !collapsed && collapsible && (
        <button
          type="button"
          className="cq-nav-group-toggle flex w-full cursor-pointer items-center justify-between gap-1 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white/45 transition-colors hover:bg-white/5 hover:text-white/70"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="truncate">{group.label}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
            aria-hidden="true"
          />
        </button>
      )}
      {group.label && !collapsed && !collapsible && (
        <p className="cq-nav-group-label">{group.label}</p>
      )}
      {group.label && collapsed && <div className="cq-nav-group-divider" aria-hidden="true" />}
      {(collapsed || !group.label || open) &&
        items.map((item) => {
          const active = isItemActive(location.pathname, item)
          return (
            <SidebarItem key={item.path} item={item} active={active} collapsed={collapsed} />
          )
        })}
    </div>
  )
}
