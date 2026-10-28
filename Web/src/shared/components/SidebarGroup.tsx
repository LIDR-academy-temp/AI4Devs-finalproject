import { useLocation } from 'react-router-dom'
import type { NavGroup, NavItem } from '../navigation/appNavigation'
import { SidebarItem } from './SidebarItem'

interface SidebarGroupProps {
  group: NavGroup
  items: NavItem[]
  collapsed: boolean
}

export function SidebarGroup({ group, items, collapsed }: SidebarGroupProps) {
  const location = useLocation()

  if (items.length === 0) return null

  return (
    <div className="cq-nav-group flex flex-col">
      {group.label && !collapsed && (
        <p className="cq-nav-group-label">{group.label}</p>
      )}
      {group.label && collapsed && <div className="cq-nav-group-divider" aria-hidden="true" />}
      {items.map((item) => {
        const active =
          location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(`${item.path}/`))
        return (
          <SidebarItem key={item.path} item={item} active={active} collapsed={collapsed} />
        )
      })}
    </div>
  )
}
